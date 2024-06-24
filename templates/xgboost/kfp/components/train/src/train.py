# Copyright contributors to the Kmodels project

import os
import sys
import logging
import argparse

import numpy as np
import pandas as pd
import xgboost as xgb

from metrics import Metrics
from workspace import Workspace

from sklearn import metrics
from sklearn.model_selection import train_test_split

# Configure logger
logging.basicConfig(
  level=logging.INFO,
  format="%(asctime)s [%(levelname)s] %(message)s",
  handlers=[
    logging.StreamHandler()
  ]
)

# Train model
def train(args):

    # Load training data
    df = pd.read_csv(f"{workspace.get_data_path()}/data.csv")
    logging.info(df.head())

    # Data x,y
    X = df.drop(args.target, axis=1)
    y = df[args.target]

    # Split for testing
    x_train, x_test, y_train, y_test = train_test_split(X, y,
        test_size=0.2, random_state=42)

    sample_weights = np.full((len(x_train)), 1).tolist()

    data_train = xgb.DMatrix(x_train, label=y_train, weight=sample_weights)
    data_test = xgb.DMatrix(x_test, label=y_test)

    # Train model
    parameters = {
        "eta": args.eta,
        "objective": "multi:softprob",
        "num_class": args.num_class or y.nunique(),
        "max_depth": args.max_depth,
        }
    xgb_model = xgb.train(parameters, data_train, 20)

    # Generate accuracy
    preds = xgb_model.predict(data_test)
    best_preds = np.asarray([np.argmax(line) for line in preds])

    # Generate model score
    score = metrics.accuracy_score(y_test, best_preds)

    if score > args.score_threshold:
        # Save metrics
        metric = Metrics()
        metric.set_score(score)
        metric.add('f1', metrics.accuracy_score(y_test, best_preds), "raw")
        workspace.put_metrics(metric.get_all())

        # Save model
        local_file = os.path.join(workspace.get_model_path(), 'model.bst')
        xgb_model.save_model(local_file)
    else:
        # Low score, reject model
        raise Exception(f"score {score} below threshold {args.score_threshold}")

    logging.info(f"training completed")

if __name__ == '__main__':

    # Defining and parsing the command-line arguments
    parser = argparse.ArgumentParser(description='Generic XGBoost Classifier')
    parser.add_argument('--model_id', type=str)
    parser.add_argument('--workspace', type=str, default="workspace", help='Base path for result files')
    parser.add_argument('--num_class', type=int, default=0)
    parser.add_argument('--max_depth', type=int, default=3)
    parser.add_argument('--eta', type=float, default=0.3)
    parser.add_argument('--score_threshold', type=float, default=0.5)
    parser.add_argument('--target', type=str, default="target")

    # Parse arguments
    args = parser.parse_args()

    # Model workspace
    workspace = Workspace(args.model_id, args.workspace)

    # Add logging to file. The logs file will be uploaded to
    logging.getLogger().addHandler(logging.FileHandler(f"{workspace.get_logs_path()}/pipeline.log"))

    # Log args
    logging.info(f"args: {args}")

    # Train model
    try:
        train(args)
    except Exception as ex:
        logging.error(ex)
        workspace.put_error({ "message": str(ex), "code": 100 })
        sys.exit(1)