# Train

Kubeflow pipeline component for generating xgboost model

### Run locally

Build component docker image
```
make build-kfp
```

Add training data file `data.json` to `data` folder and run training
```
docker run -it --rm \
    -v $(pwd)/data:/workspace/xgboost/data \
    -v $(pwd)/workspace:/workspace \
    --entrypoint bash \
    docker.io/component/xgboost-train:1.0.0 \
    -c 'python train.py --model_id=xgboost'
```

The generated model will be created in `pretrained/model`

You can also run the training docker
```
docker run -it --rm \
    -v $(pwd)/data:/workspace/xgboost/data \
    -v $(pwd)/workspace:/workspace \
    -v $(pwd)/kfp/components/train/src:/train \
    -w /train \
    --entrypoint bash \
    docker.io/component/xgboost-train:1.0.0
```

and run training with the command
```
python train.py --model_id=xgboost
```

with this option, you can change the code locally and rerun training.
