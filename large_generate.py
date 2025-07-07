import random
import json

# Contest and problems
contest = {
    "name": "Test Collegiate Programming Contest",
    "durationMinutes": 120,
    "freezeDurationMinutes": 60,
    "penaltyMinutes": 15
}

problems = [{"index": chr(ord('A') + i), "points": 1} for i in range(9)]
problem_indices = [p["index"] for p in problems]

# Contestants
team_names = [
    "CodeRunners", "CodeCrafters", "Syntax Terror", "Runtime Terror", "AlgoRythm", "Ctrl+Shift+Code",
    "JurySmashers", "Monkey Players", "See_Plus+", "JThweb", "Bit Busters", "Byte Bandits", "HackStreet Boys",
    "Codestallation", "Ternary", "Stack Overflowers", "404", "Infinte Loopers", "Quick Ninjas", "Bug Squashers",
    "Binary Beasts", "Null", "Code Queens", "Debuggers", "JetBrains", "Zzz...", "Python4Dessert", "Shift+Del+U"
]

contestants = [{"name": name, "logo": "img/bps.png", "rank": "novice"} for name in team_names]

# Problem rules
empty_problem = random.choice(problem_indices)
only_one_correct_problem = random.choice([p for p in problem_indices if p != empty_problem])
almost_all_correct_problem = random.choice([p for p in problem_indices if p not in [empty_problem, only_one_correct_problem]])

remaining_problems = [p for p in problem_indices if p not in [empty_problem, only_one_correct_problem, almost_all_correct_problem]]

submissions = []

# Helper to create a submission
def make_submission(name, problem_index, correct):
    return {
        "name": name,
        "problemIndex": problem_index,
        "submitMinutes": random.randint(6, 119),
        "points": correct
    }

# No one submits empty_problem
# Only one team submits and solves only_one_correct_problem
chosen_team = random.choice(team_names)
submissions.append(make_submission(chosen_team, only_one_correct_problem, 1))

# Almost all teams submit almost_all_correct_problem (some wrong)
for name in team_names:
    correct = 1 if random.random() < 0.84 else 0  # 90% correct
    submissions.append(make_submission(name, almost_all_correct_problem, correct))

# Remaining problems: random submissions and outcomes
for problem in remaining_problems:
    for name in team_names:
        if random.random() < 0.45:  # 40% chance this team submits this problem
            correct = random.randint(0, 1)
            submissions.append(make_submission(name, problem, correct))

# Compile final structure
data = {
    "contest": contest,
    "problems": problems,
    "contestants": contestants,
    "submissions": submissions
}

# Export to resolver.json
with open("resolver.json", "w") as f:
    json.dump(data, f, indent=2)

print(f"Generated resolver.json with {len(submissions)} submissions.")
