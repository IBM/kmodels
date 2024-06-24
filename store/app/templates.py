# Copyright contributors to the Kmodels project

import os
import tarfile
import logging
import glob
import shutil
import json

from minio import Minio

logger = logging.getLogger("uvicorn")

class Templates:

    def __init__(self):
        host = os.getenv("MINIO_URL", "host.docker.internal")
        port = os.getenv("MINIO_PORT", "9000")
        access_key = os.getenv("MINIO_ACCESS_KEY", "minio")
        secret_key = os.getenv("MINIO_SECRET_KEY", "minio123")
        self.client = Minio(
            f"{host}:{port}",
            # "host.docker.internal:9000",
            # "ai4a-dev-9ca4d14d48413d18ce61b80811ba4308-0000.us-south.containers.appdomain.cloud:32236/",
            access_key=access_key,
            secret_key=secret_key,
            secure=False
        )
        self.bucket = os.getenv("MODEL_STORE", "models-store")
        if not self.client.bucket_exists(self.bucket):
            logger.info(f"Create store templates bucket {self.bucket}")
            self.client.make_bucket(self.bucket)
        self.info_name = 'info.json'
        self.manifest_name = 'manifest.json'
        # Temporary for extracting template
        self.temp_path = f"/tmp"

    def list(self):
        templates = []
        objects = self.client.list_objects(self.bucket)
        for obj in objects:
            templates.append(obj.object_name.replace('/', ''))
        return templates

    def add(self, file: str):
        logger.info(f"Adding {file}")
        # Template name
        name = os.path.splitext(os.path.basename(file))[0]
        # Target extraction path
        target = f"{self.temp_path}/{name}"
        # Extract
        logger.debug(f"Extract template package to {target}")
        tar = tarfile.open(file)
        tar.extractall(target)
        tar.close()
        # List all template files
        files = []
        for f in glob.iglob(f"{target}/**/*", recursive=True):
            if os.path.isfile(f):
                files.append(f)
        # Upload template files
        logger.debug(f"Upload template files")
        for f in files:
            object = f.removeprefix(f"{self.temp_path}/")
            logger.debug(f"Uploading {object}")
            self.client.fput_object(self.bucket, object, f, num_parallel_uploads=1)
        # Cleanup
        logger.debug(f"Cleanup")
        shutil.rmtree(self.temp_path, ignore_errors=True)

    def delete(self, template_name: str):
        '''Delete a template'''
        try:
            removed = []
            objects = self.client.list_objects(self.bucket, prefix=template_name, recursive=True)
            for obj in objects:
                self.client.remove_object(self.bucket, obj.object_name)
                removed.append(obj.object_name)
            return removed
        except Exception as e:
            logger.error(e)
            return None

    def get_template_info(self, template_name: str):
        try:
            template = {}
            # Get template info
            template["info"] = self.get_json(self.bucket, f"{template_name}/{self.info_name}")
            # Get versions
            versions = []
            for object in self.client.list_objects(self.bucket, prefix=template_name, recursive=True):
                if len(object.object_name.split('/')) <= 2:
                    continue
                version = object.object_name.split('/')[1]
                if version not in versions:
                    versions.append(version)
            template["versions"] = versions
            return template
        except Exception as e:
            logger.error(e)
            return None

    def get_template_version(self, template_name: str, template_version: str = None):
        '''Get template data'''
        try:
            template = {}
            # Get template info
            template["info"] = self.get_json(self.bucket, f"{template_name}/{self.info_name}")
            # Filter versions
            # if template_version:
            for object in self.client.list_objects(self.bucket, prefix=f"{template_name}/{template_version}", recursive=True):
                if len(object.object_name.split('/')) <= 2:
                    continue
                version = object.object_name.split('/')[1]
                template["version"] = version
                if "manifest.json" in object.object_name:
                    template["manifest"] = self.get_json(self.bucket, object.object_name)
                if "pipeline" in object.object_name:
                    template["pipeline"] = self.get_yaml(self.bucket, object.object_name)
            return template
        except Exception as e:
            logger.error(e)
            return None

    def delete_template_version(self, template_name: str, template_version: str = None):
        '''Delete template version'''
        try:
            removed = []
            objects = self.client.list_objects(self.bucket, prefix=template_name, recursive=True)
            for obj in objects:
                if obj.object_name.startswith(f"{template_name}/{template_version}/"):
                    self.client.remove_object(self.bucket, obj.object_name)
                    removed.append(obj.object_name)
            return removed
        except Exception as e:
            logger.error(e)
            return None

    def get_template_version_model(self, template_name: str, template_version: str, destination_path: str):
        '''Put template pre-trained models in the specified folder'''
        files = []
        objects = self.client.list_objects(self.bucket, f"{template_name}/{template_version}/models/")
        for obj in objects:
            file = os.path.join(destination_path, os.path.basename(obj.object_name))
            logger.debug(f"Download {obj.object_name} to {file}")
            self.client.fget_object(self.bucket, obj.object_name, file)
            files.append(file)
        return files

    def get_json(self, bucket, name):
        '''Helper function'''
        object = self.client.get_object(bucket, name)
        return json.loads(object.data)

    def get_yaml(self, bucket, name):
        '''Helper function'''
        object = self.client.get_object(bucket, name)
        return object.data
