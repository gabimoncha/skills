#!/usr/bin/env python3
"""Prepare isolated with/without-skill fixtures; does not invoke a model."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--suite", default="evals.json", help="Suite filename in evals/")
    parser.add_argument("--profile", help="Model profile from the suite's model matrix")
    parser.add_argument("--baseline-iteration", type=int,
                        help="Reuse without-skill outputs from this earlier iteration")
    args = parser.parse_args()
    if args.iteration < 1:
        parser.error("--iteration must be positive")
    skill = Path(__file__).resolve().parents[1]
    cases = json.loads((skill / "evals" / args.suite).read_text())
    if cases.get("model_matrix"):
        matrix = json.loads((skill / "evals" / cases["model_matrix"]).read_text())
        profiles = {profile["id"]: profile for profile in matrix["profiles"]}
        if args.profile not in profiles:
            parser.error("choose --profile from: " + ", ".join(profiles))
        profile = profiles[args.profile]
        cases.update({"profile": profile["id"], "model": profile["model"],
                      "reasoning_effort": profile["reasoning_effort"],
                      "grader": matrix["grader"]})
    elif args.profile:
        parser.error("this suite does not define a model matrix")
    workspace = skill / "workspace"
    baseline = None
    if args.baseline_iteration is not None:
        baseline = workspace / f"iteration-{args.baseline_iteration}"
        if args.baseline_iteration >= args.iteration or not (baseline / "benchmark.json").is_file():
            parser.error("baseline must be an earlier, completed iteration")
        baseline_suite = json.loads((baseline / "evals-snapshot.json").read_text())
        if any(baseline_suite.get(key) != cases.get(key) for key in ("model", "reasoning_effort", "evals")):
            parser.error("baseline must match the selected model, reasoning effort, and cases")
    iteration = workspace / f"iteration-{args.iteration}"
    iteration.mkdir(parents=True, exist_ok=False)
    snapshot = iteration / "skill-snapshot"
    shutil.copytree(skill, snapshot, ignore=shutil.ignore_patterns("evals", "workspace", "__pycache__"))
    hashes = {
        str(path.relative_to(snapshot)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in snapshot.rglob("*") if path.is_file()
    }
    (iteration / "skill-snapshot.sha256.json").write_text(json.dumps(hashes, indent=2) + "\n")
    (iteration / "evals-snapshot.json").write_text(json.dumps(cases, indent=2) + "\n")
    if baseline:
        (iteration / "baseline.json").write_text(json.dumps({
            "iteration": baseline.name, "note": "Without-skill outputs reused, not rerun."
        }, indent=2) + "\n")
    for case in cases["evals"]:
        source = skill / "evals/files" / case["name"]
        for variant in cases.get("variants", ["with_skill", "without_skill"]):
            if baseline and variant == "without_skill":
                continue
            run = iteration / f"eval-{case['name']}" / variant
            outputs = run / "outputs"
            project = outputs / "project"
            if (source / "project").is_dir():
                shutil.copytree(source, outputs)
                pointer = project / "LEARN.md"
                pointer.write_text(pointer.read_text().replace(
                    "@SHARED_NOTEBOOK@", str(outputs / "notebook/LEARN.md")))
            else:
                shutil.copytree(source, project)
            for command in (
                ["git", "init", "--quiet", str(project)],
                ["git", "-C", str(project), "add", "."],
                ["git", "-C", str(project), "-c", "user.name=Skill Eval",
                 "-c", "user.email=skill-eval@example.invalid",
                 "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Fixture"],
            ):
                subprocess.run(command, check=True, capture_output=True, text=True)
            def git(*arguments):
                return subprocess.run(["git", "-C", str(project), *arguments],
                                      check=True, capture_output=True, text=True).stdout

            def copy_changes(changes):
                for change in changes:
                    destination = project / change["target"]
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(skill / change["source"], destination)
                    if change.get("staged"):
                        git("add", "--", change["target"])

            if case.get("head_changes"):
                git("branch", case["base_ref"])
                git("checkout", "--quiet", "-b", case["head_ref"])
                copy_changes(case["head_changes"])
                git("add", ".")
                git("-c", "user.name=Skill Eval", "-c", "user.email=skill-eval@example.invalid",
                    "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "PR changes")
            copy_changes(case.get("changes", []))
            (run / "initial-git.json").write_text(json.dumps({
                "head": git("rev-parse", "HEAD"), "index": git("ls-files", "--stage"),
                "remotes": git("remote", "-v")
            }, indent=2) + "\n")
            initial = {
                str(path.relative_to(outputs)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in outputs.rglob("*")
                if path.is_file() and ".git" not in path.parts
            }
            (run / "initial-files.json").write_text(json.dumps(initial, indent=2) + "\n")
            (run / "prompt.txt").write_text(case["prompt"] + "\n")
            if case.get("context"):
                (run / "context.txt").write_text(case["context"] + "\n")
            (run / "timing.json").write_text(json.dumps({
                "total_tokens": None, "duration_ms": None,
                "note": "Record measured telemetry after execution; unavailable fields remain null."
            }, indent=2) + "\n")
    print(iteration)


if __name__ == "__main__":
    main()
