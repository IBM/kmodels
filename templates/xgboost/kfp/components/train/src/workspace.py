import os
import json

# Local workspace storage (disk, for local development)
class Workspace:

    def __init__(self, model_id: str, workspace: str = "/workspace"):
        self.workspace = workspace
        self.model_id = model_id
        # Create required folders
        os.makedirs(self.get_model_path(), exist_ok=True)
        os.makedirs(self.get_logs_path(), exist_ok=True)

    def put_error(self, error):
        with open(f"/{self.workspace}/{self.model_id}/error.json", 'w') as f:
            json.dump(error, f)

    def put_metrics(self, metrics):
        with open(f"/{self.workspace}/{self.model_id}/metrics.json", 'w') as f:
            json.dump(metrics, f)

    def get_metrics_path(self):
        return f"/{self.workspace}/{self.model_id}"

    def get_error_path(self):
        return f"/{self.workspace}/{self.model_id}"

    def get_model_path(self):
        return f"/{self.workspace}/{self.model_id}/model"

    def get_data_path(self):
        return f"/{self.workspace}/{self.model_id}/data"

    def get_logs_path(self):
        return f"/{self.workspace}/{self.model_id}/logs"