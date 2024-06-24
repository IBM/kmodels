# Copyright contributors to the Kmodels project

import requests

class Api:

    def __init__(self, host: str = "km-controller.opendatahub", port: str = "3000"):
        self.protocol = "http"
        self.api_version = 'v1'
        self.host = host
        self.port = port

    def send_event(self, type, event):
        url = f"{self.protocol}://{self.host}:{self.port}/api/{self.api_version}/event/{type}"
        response = requests.post(url, json=event)
        if response.status_code != 200:
            pass

