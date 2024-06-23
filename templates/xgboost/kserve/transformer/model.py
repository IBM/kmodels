import kserve
import logging
import argparse

from transformer import Transformer

# Logging
logging.basicConfig(level=kserve.constants.KSERVE_LOGLEVEL)

# Server arguments
parser = argparse.ArgumentParser(parents=[kserve.model_server.parser])

# Tranformaer arguments
parser.add_argument(
    '--model_output', default=None,
    help='The selected output model format')

# Parse arguments
args, _ = parser.parse_known_args()

# Main
if __name__ == "__main__":
    logging.info(f"Args: {args}")

    # Create and load model
    transformer = Transformer(args.model_name, predictor_host=args.predictor_host,
                              model_output=args.model_output)

    # Start serving
    kserve.ModelServer().start([transformer] if transformer.ready else [])
