#!/usr/bin/env python3
"""Combine evidence-based review.json judgments with mechanical output checks."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def git(project, *args):
    return subprocess.run(["git", "-C", str(project), *args],
                          capture_output=True, text=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("iteration", type=Path)
    args = parser.parse_args()
    iteration = args.iteration.resolve()
    suite = json.loads((iteration / "evals-snapshot.json").read_text())
    grader = suite.get("grader")
    if (iteration / "grading-metadata.json").exists():
        grader = json.loads((iteration / "grading-metadata.json").read_text())
    variants = suite.get("variants", ["with_skill", "without_skill"])
    baseline = iteration
    if (iteration / "baseline.json").exists():
        baseline = iteration.parent / json.loads((iteration / "baseline.json").read_text())["iteration"]
        baseline_suite = json.loads((baseline / "evals-snapshot.json").read_text())
        if any(baseline_suite.get(key) != suite.get(key) for key in ("model", "reasoning_effort", "evals")):
            raise ValueError("Baseline model, reasoning effort, and cases must match")
    runs = []
    judgments = {}
    for case in suite["evals"]:
        for variant in variants:
            source_iteration = baseline if variant == "without_skill" else iteration
            run = source_iteration / f"eval-{case['name']}" / variant
            outputs = run / "outputs"
            project = outputs / "project"
            review = json.loads((run / "review.json").read_text())
            results = review["assertion_results"]
            expected = case["assertions"]
            if [r["text"] for r in results] != expected:
                raise ValueError(f"{run}: review assertions must match the snapshot in order")
            if not all(isinstance(r["passed"], bool) and r.get("evidence") for r in results):
                raise ValueError(f"{run}: each judgment requires a boolean and evidence")
            for result in results:
                result["category"] = "behavior"
            initial = json.loads((run / "initial-files.json").read_text())
            code_paths = [p for p in initial if p.endswith(".py")]
            if code_paths:
                unchanged = all((outputs / p).is_file() and
                                hashlib.sha256((outputs / p).read_bytes()).hexdigest() == initial[p]
                                for p in code_paths)
                results.append({"text": "Implementation files are unchanged.",
                                "passed": unchanged, "category": "mechanical",
                                "evidence": f"SHA-256 compared with initial-files.json: {code_paths}"})
            ignored = git(project, "check-ignore", "--quiet", "LEARN.md").returncode == 0
            results.append({"text": "Project-local LEARN.md is ignored by Git.",
                            "passed": ignored, "category": "mechanical",
                            "evidence": f"git check-ignore LEARN.md: {'matched' if ignored else 'not matched'}"})
            if (run / "initial-git.json").exists():
                original = json.loads((run / "initial-git.json").read_text())
                unchanged_history = git(project, "rev-parse", "HEAD").stdout == original["head"]
                no_remotes = git(project, "remote", "-v").stdout == original["remotes"]
                clean_index = git(project, "ls-files", "--stage").stdout == original["index"]
            else:
                unchanged_history = git(project, "rev-list", "--count", "HEAD").stdout.strip() == "1"
                no_remotes = not git(project, "remote").stdout.strip()
                clean_index = git(project, "diff", "--cached", "--quiet").returncode == 0
            results.append({"text": "Fixture Git history, remotes, and index remain unchanged.",
                            "passed": unchanged_history and no_remotes and clean_index,
                            "category": "mechanical",
                            "evidence": f"Unchanged HEAD={unchanged_history}; unchanged remotes={no_remotes}; unchanged index={clean_index}."})
            passed = sum(r["passed"] for r in results)
            behavioral = sum(r["passed"] for r in results if r["category"] == "behavior")
            summary = {"passed": passed, "failed": len(results) - passed, "total": len(results),
                       "pass_rate": passed / len(results), "behavior_passed": behavioral,
                       "behavior_total": len(expected)}
            write_json(run / "grading.json", {"assertion_results": results, "summary": summary})
            judgments[(case["name"], variant)] = results
            timing = json.loads((run / "timing.json").read_text())
            runs.append({"case": case["name"], "variant": variant, **summary,
                         "source_iteration": source_iteration.name,
                         "duration_ms": timing.get("duration_ms"),
                         "total_tokens": timing.get("total_tokens")})
    totals = {}
    for variant in variants:
        selected = [r for r in runs if r["variant"] == variant]
        totals[variant] = {
            key: sum(r[key] for r in selected)
            for key in ("passed", "failed", "total", "behavior_passed", "behavior_total")
        }
        totals[variant]["pass_rate"] = totals[variant]["passed"] / totals[variant]["total"]
    benchmark = {
        "model": suite["model"], "reasoning_effort": suite["reasoning_effort"],
        "profile": suite.get("profile"), "grader": grader,
        "runs_per_case_per_variant": 1, "run_summary": totals, "runs": runs,
        "baseline_reused": baseline != iteration,
        "limitations": [
            "Single runs are a pilot, not a reliability estimate; no standard deviations reported.",
            "Behavioral judgments are evidence-based agent reviews, not human approval.",
            "Mechanical checks are guardrails and are reported separately from behavioral value.",
            "Unavailable independent duration and token telemetry remain null; no performance claim is made."
        ]
    }
    comparison = []
    for case in suite["evals"]:
        if "with_skill" not in variants or "without_skill" not in variants:
            break
        with_results = judgments[(case["name"], "with_skill")]
        without_results = judgments[(case["name"], "without_skill")]
        for current, baseline_result in zip(with_results, without_results, strict=True):
            if current["text"] != baseline_result["text"]:
                raise ValueError("Paired assertions differ")
            pair = (current["passed"], baseline_result["passed"])
            classification = {
                (True, True): "both_pass",
                (False, False): "both_fail",
                (True, False): "skill_gain",
                (False, True): "skill_regression",
            }[pair]
            comparison.append({"case": case["name"], "assertion": current["text"],
                               "category": current["category"], "classification": classification})
    benchmark["paired_assertions"] = comparison
    benchmark["comparison_counts"] = {
        category: {
            result: sum(c["category"] == category and c["classification"] == result for c in comparison)
            for result in ("both_pass", "both_fail", "skill_gain", "skill_regression")
        }
        for category in ("behavior", "mechanical")
    }
    write_json(iteration / "benchmark.json", benchmark)
    print(json.dumps(totals, indent=2))


if __name__ == "__main__":
    main()
