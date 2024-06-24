# Copyright contributors to the Kmodels project

class Metrics:

    # Supported formats
    FORMAT_RAW = "raw"
    FORMAT_PERCENTAGE = "percentage"

    def __init__(self):
        self.metrics = []
        self.add("score", 1.0, "raw")

    def add(self, name: str, value: float, format: str = "percentage"):
        self.metrics.append({
            "name": name,
            "value": value,
            'format': format
        })

    def get(self, name):
        return next(m for m in self.metrics if m["name"] == name)

    def get_value(self, name):
        return self.get(name)["value"]

    def set_value(self, name: str, value: float):
        self.get(name)["value"] = value

    def get_format(self, name):
        return self.get(name)["format"]

    def set_format(self, name: str, value: str):
        self.get(name)["format"] = value

    def get_score(self):
        return self.get_value("score")

    def set_score(self, value):
        if value >= 0.0 and value <= 1.0:
            self.set_value("score", value)

    def remove(self, name):
        pass

    def get_all(self, format: str = "kmodels"):
        if format == "kubeflow":
            return list(map(lambda m: {
                    "name": m["name"], "numberValue": m["value"], "format": m["format"].upper()
                }, self.metrics))
        return self.metrics
