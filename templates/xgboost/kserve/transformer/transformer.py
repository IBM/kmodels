import kserve
import logging
import numpy as np

from typing import Dict, Union

from kserve.protocol.infer_type import InferRequest, InferResponse

# Logging
logging.basicConfig(level=kserve.constants.KSERVE_LOGLEVEL)

# Transformer
class Transformer(kserve.Model):

    def __init__(self, model_name: str, predictor_host: str, model_output: str):
        super().__init__(model_name)
        self.predictor_host = predictor_host
        self.model_output = model_output
        self.ready = True

    def postprocess(self, result: Union[Dict, InferResponse],
                    headers: Dict[str, str] = None) -> Union[Dict, InferResponse]:
        logging.info("postprocess:" + str(result))
        if (self.model_output == "output1"):
            predictions = result["predictions"]
        else:
            predictions = np.asarray([np.argmax(line) for line in result["predictions"]]).tolist()
        return {
            "predictions": predictions
        }