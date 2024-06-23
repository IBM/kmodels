from kfp import dsl, components
from kfp_tekton.compiler import TektonCompiler

@dsl.pipeline(
    name='XGboost Pipeline',
    description='The classic multi-class classification by xgboost'
)
def pipeline(model_id: str, num_class: int = 0, max_depth: int = 3, eta: float = 0.3,
             score_threshold: float = 0.5):

    # Loads the yaml manifest for each component
    train_component = components.load_component_from_file('components/train/component.yaml')

    # Run tasks
    train_component(model_id, num_class, max_depth, eta, score_threshold)

if __name__ == '__main__':
    TektonCompiler().compile(pipeline, __file__.replace('.py', '.yaml'))