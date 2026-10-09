import sys
import os
sys.path.insert(0, ".")
os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
sys.path.insert(0, os.path.abspath("external/tau-bench"))

from tau_bench.envs.retail import MockRetailDomainEnv

env = MockRetailDomainEnv(task_split="dev", user_strategy="human")
print(f"Total dev tasks: {len(env.tasks)}")
for i, t in enumerate(env.tasks):
    print(f"Task {i}: User={t.user_id} | Actions={t.actions} | Instruction={t.instruction[:90]}...")
