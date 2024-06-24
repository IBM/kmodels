# Copyright contributors to the Kmodels project

import os
import version
import logging

from templates import Templates

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)

app = FastAPI(
  title="KStore API",
  description="KModels store API",
  version="0.0.1",
  contact={
    "name": "Eyal Cohen",
    "email": "eyalco@il.ibm.com",
  },
  license_info={
    "name": "Apache 2.0",
    "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
  },
)

templates = Templates()

@app.get("/version", tags=["General"])
def get_version():
    """Get store app version"""
    return version.version()

@app.get("/templates", tags=["Templates"])
def get_templates():
    return templates.list()

@app.post("/templates", tags=["Templates"])
def post_template(file: UploadFile = File(...)):
    logger.debug(f"Received template file {file.filename}")
    try:
        contents = file.file.read()
        with open(file.filename, 'wb') as f:
            f.write(contents)
        templates.add(file.filename)
        os.remove(file.filename)
    except Exception as e:
        return {"message": "There was an error uploading the file"}
    finally:
        file.file.close()
    return f"Successfully uploaded {file.filename}"

@app.delete("/templates/{name}", tags=["Templates"])
def delete_template(name: str):
    removed = templates.delete(name)
    if not removed:
        raise HTTPException(status_code=404, detail="Template not found")
    return removed

@app.get("/template/{name}/info", tags=["Template"])
def get_template_info(name: str):
    info = templates.get_template_info(name)
    if not info:
        raise HTTPException(status_code=404, detail="Template information not found")
    return info

@app.get("/template/{name}/versions/{version}", tags=["Template"])
def get_template_version(name: str, version: str):
    template = templates.get_template_version(name, version)
    if not template:
        raise HTTPException(status_code=404, detail="Template version not found")
    return template

@app.delete("/template/{name}/versions/{version}", tags=["Template"])
def delete_template_version(name: str, version: str):
    removed = templates.delete_template_version(name, version)
    if not removed:
        raise HTTPException(status_code=404, detail="Template version not found")
    return removed

@app.get("/template/{name}/versions/{version}/model", tags=["Template"])
def get_template_model(name: str, version: str):
    files = templates.get_template_version_model(name, version, "/tmp")
    return FileResponse(files[0], media_type='application/octet-stream', filename=os.path.basename(files[0]))

# Load default templates
logger.info(f"Load default templates from {os.getcwd()}/templates")
for (dirpath, dirnames, filenames) in os.walk(f"{os.getcwd()}/templates"):
    for file in filenames:
        try:
            root, ext = os.path.splitext(file)
            if ext == ".tar":
                templates.add(os.path.join(dirpath, file))
        except Exception as e:
            logger.error(e)