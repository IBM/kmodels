## Templates

In this folder, we provide an example model template. The `xgboost` template is designed for solving generic numeric classification problems.

### Structure of the Template

The template comprises three main components:

1. **Kfp**: This section includes the source code necessary to train a model. It encompasses the algorithm, its parameters, preprocessing steps, and the training code itself. An image is produced based on the source code and saved on a docker registry. Additionally, The source code is converted into Kubeflow Pipelines (KFP), which handle the actual training process and generate a binary object representing the trained model. the KFP configuration YAML will be saved in a placeholder in the template folder under the template version.

2. **Kserve**: Once the binary model is produced by KFP, this component serves as the endpoint for making predictions. It handles any inference requests using the trained model. Similar to the KFP section, an image will be generated and saved to be used   0by the KModels system.

3. **Template Configuration**: This part contains the necessary configuration and parameters that are utilized by the previous components. Each numeric folder under `template` represents a version of the template. Additionally, The `manifest.json` file contains the definition of the template arguments.

### Deployment Process

Upon implementing each component, the template folder is packaged into a tar file. This file is then consumable by the KModels system, making it possible to generate multiple models with varying arguments. This flexibility allows for efficient deployment and utilization of models tailored to specific requirements.
