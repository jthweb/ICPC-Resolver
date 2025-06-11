async function sha512Hash(string) {
    return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(string)).then(buf => {
        return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
    });
}

function uniqueByKey(array, key) {
    const seen = new Set();
    return array.filter(item => {
        if (seen.has(item[key])) return false;
        seen.add(item[key]);
        return true;
    });
}

function getColorForScore(score, maxScore) {
    score = Math.max(0, Math.min(maxScore, score));

    const startColor = { r: 167, g: 11, b: 11 };
    const midColor = { r: 167, g: 167, b: 11 };
    const endColor = { r: 11, g: 167, b: 11 };

    let r, g, b;
    const midPoint = maxScore / 2;

    if (score <= midPoint) {
        const ratio = score / midPoint;
        r = startColor.r;
        g = startColor.g;
        b = startColor.b;
    } else {
        const ratio = (score - midPoint) / midPoint;
        r = endColor.r;
        g = endColor.g;
        b = endColor.b;
    }

    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function changeOption() {
    const form = document.getElementById("form");
    for (let i = 0; i < form.children.length; i++) {
        const child = form.children[i];
        if (child.id.startsWith("input-")) {
            child.style.display = "none";
        }
    }

    const option = document.getElementById("option").value;
    document.getElementById(`input-${option}`).style.display = "flex";
}

function readJSON() {
    const file = document.getElementById("file").files[0];
    if (!file) {
        alert("Please select a file");
        return;
    }

    const jsonText = document.getElementById("json-data");
    if (jsonText.value) {
        if (!confirm("Are you sure you want to overwrite the current data?")) {
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        jsonText.value = e.target.result;
    };

    reader.readAsText(file);
}

async function fetchAPI(method, params, apiKey, apiSecret) {
    let url = `https://codeforces.com/api/${method}?` + (new URLSearchParams(params).toString());
    if (apiKey && apiSecret) {
        const time = Math.floor(Date.now() / 1000);
        const rand = Math.floor(Math.random() * (10 ** 6 - 10 ** 5 - 1)) + 10 ** 5;
        params.apiKey = apiKey;
        params.time = time;
        params = Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
        const hash = await sha512Hash(`${rand}/${method}?` + (new URLSearchParams(params).toString()) + '#' + apiSecret);
        url += `&apiKey=${apiKey}&time=${time}&apiSig=${rand}${hash}`;
    }

    console.log("Fetching", url);

    const response = await fetch(url);
    let { status, result, comment } = await response.json();
    if (comment) {
        comment = comment.split(';');
    }

    console.log("Fetched", { status, result, comment });

    return { status, result, comment };
}

async function fetchContest() {
    const contestId = document.getElementById("contestId").value.trim();
    const apiKey = document.getElementById("apiKey").value.trim();
    const apiSecret = document.getElementById("apiSecret").value.trim();

    if (!contestId || !apiKey || !apiSecret) {
        return;
    }

    const jsonText = document.getElementById("json-data");

    if (jsonText.value) {
        if (!confirm("Are you sure you want to overwrite the current data?")) {
            return;
        }
    }

    jsonText.value = "Fetching contest info and problems...";
    let { status, result, comment } = await fetchAPI('contest.standings', { contestId, participantTypes: "CONTESTANT", asManager: true }, apiKey, apiSecret);

    let contest, problems;
    if (status != "OK") {
        jsonText.value = comment.join('\n');
        return;
    } else {
        jsonText.value += " done\n";
        ({ contest, problems } = result);
    }

    jsonText.value += "Waiting between requests...";
    await new Promise(resolve => setTimeout(resolve, 2500));
    jsonText.value += " done\n";

    jsonText.value += "Fetching contest submissions...";
    ({ status, result, comment } = await fetchAPI('contest.status', { contestId, asManager: true }, apiKey, apiSecret));

    let submissions;
    if (status != "OK") {
        jsonText.value = comment.join('\n');
        return;
    } else {
        jsonText.value += " done\n";
        submissions = result;
    }

    // Filter out submissions by participant type
    submissions = submissions.filter(submission => submission.author.participantType == "CONTESTANT");

    // Fillter out submissions by verdict
    const verdicts = ["OK", "PARTIAL", "RUNTIME_ERROR", "WRONG_ANSWER", "PRESENTATION_ERROR", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "IDLENESS_LIMIT_EXCEEDED"];
    submissions = submissions.filter(submission => verdicts.includes(submission.verdict));

    // Reverse submissions
    submissions = submissions.reverse();

    const contestants = uniqueByKey([...new Set(submissions.map(submission => submission.author.members[0]))], "handle");
    for (let i = 0; i < contestants.length; i++) {
        contestants[i].index = i;
    }

    const realContestants = contestants.filter(contestant => !contestant.handle.includes("="));

    if (realContestants.length != 0) {
        jsonText.value += "Waiting between requests...";
        await new Promise(resolve => setTimeout(resolve, 2500));
        jsonText.value += " done\n";

        jsonText.value += "Fetching contestant info...";
        ({ status, result, comment } = await fetchAPI('user.info', { handles: realContestants.map(contestant => contestant.handle).join(";"), checkHistoricHandles: false }));

        let users;
        if (status != "OK") {
            jsonText.value = comment.join('\n');
            return;
        } else {
            jsonText.value += " done\n";
            users = result;
        }

        for (let i = 0; i < realContestants.length; i++) {
            contestants[realContestants[i].index].logo = users[i].titlePhoto || users[i].avatar;
            contestants[realContestants[i].index].rank = users[i].rank;
        }
    }

    const data = {};
    data.contest = {};
    data.contest.name = contest.name;
    data.contest.durationMinutes = Math.floor(contest.durationSeconds / 60);
    data.contest.freezeDurationMinutes = Math.floor(contest.freezeDurationSeconds / 60);
    data.contest.penaltyMinutes = 20;
    data.problems = problems.map(problem => {
        return {
            index: problem.index,
            points: problem.points || (contest.type == "IOI" ? 100 : 1),
        };
    });


    data.contestants = contestants.map(contestant => {
        return {
            name: contestant.name || contestant.handle,
            logo: contestant.logo,
            rank: contestant.rank,
        };
    });

    data.submissions = submissions.map(submission => {
        return {
            name: submission.author.members[0].name || submission.author.members[0].handle,
            problemIndex: submission.problem.index,
            submitMinutes: Math.floor(submission.relativeTimeSeconds / 60),
            points: submission.points || (submission.verdict == "OK" ? 1 : 0),
        };
    });

    jsonText.value = JSON.stringify(data, null, 2);
}

function validateJSONFormat(jsonString, schema) {
    try {
        const obj = JSON.parse(jsonString);
        return validateObject(obj, schema);
    } catch (e) {
        return "Invalid JSON: " + e.message;
    }
}

function validateObject(obj, schema, path = "") {
    for (const [key, type] of Object.entries(schema)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in obj)) {
            return `Missing key: ${currentPath}`;
        }

        if (Array.isArray(type)) {
            if (!Array.isArray(obj[key])) {
                return `Expected an array at: ${currentPath}`;
            }

            for (let i = 0; i < obj[key].length; i++) {
                const error = validateObject(obj[key][i], type[0], `${currentPath}[${i}]`);
                if (error) {
                    return error;
                }
            }
        } else if (typeof type === "object") {
            if (typeof obj[key] !== "object" || Array.isArray(obj[key])) {
                return `Expected an object at: ${currentPath}`;
            }

            const error = validateObject(obj[key], type, currentPath);
            if (error) {
                return error;
            }
        } else if (typeof obj[key] !== type) {
            return `Type mismatch at: ${currentPath} (Expected ${type}, got ${typeof obj[key]})`;
        }
    }

    return null;
}

function validateJSON() {
    const text = document.getElementById("json-data").value;

    const schema = {
        contest: {
            name: "string",
            durationMinutes: "number",
            freezeDurationMinutes: "number",
            penaltyMinutes: "number",
        },
        problems: [
            {
                index: "string",
                points: "number",
            },
        ],
        contestants: [
            {
                name: "string",
            },
        ],
        submissions: [
            {
                name: "string",
                problemIndex: "string",
                submitMinutes: "number",
                points: "number",
            },
        ]
    };

    const error = validateJSONFormat(text, schema);
    if (error) {
        alert(error);
        return false;
    }

    const { contest, problems, contestants, submissions } = JSON.parse(text);

    // Check for contest info
    if (contest.durationMinutes <= 0) {
        alert("Invalid contest duration");
        return false;
    }

    if (contest.freezeDurationMinutes < 0 || contest.freezeDurationMinutes > contest.durationMinutes) {
        alert("Invalid freeze duration");
        return false;
    }

    if (contest.penaltyMinutes < 0) {
        alert("Invalid penalty duration");
        return false;
    }

    // Check for duplicate problem indexes and problem points
    const problemIndexes = new Set();
    for (const problem of problems) {
        if (problemIndexes.has(problem.index)) {
            alert(`Duplicate problem index: ${problem.index}`);
            return false;
        }

        problemIndexes.add(problem.index);

        if (problem.points <= 0) {
            alert(`Invalid points for problem ${problem.index}`);
            return false;
        }
    }

    // Check for contestant names
    const contestantNames = new Set();
    for (const contestant of contestants) {
        if (contestantNames.has(contestant.name)) {
            alert(`Duplicate contestant name: ${contestant.name}`);
            return false;
        }

        contestantNames.add(contestant.name);
    }

    // Check if all submissions are valid
    for (const submission of submissions) {
        if (!problemIndexes.has(submission.problemIndex)) {
            alert(`Invalid problem index: ${submission.problemIndex}`);
            return false;
        }

        if (!contestantNames.has(submission.name)) {
            alert(`Invalid contestant name: ${submission.name}`);
            return false;
        }

        if (submission.submitMinutes < 0 || submission.submitMinutes >= contest.durationMinutes) {
            alert(`Invalid submit time for ${submission.name} at ${submission.problemIndex}: ${submission.submitMinutes}`);
            return false;
        }

        if (submission.points < 0 || submission.points > problems.find(problem => problem.index == submission.problemIndex).points) {
            alert(`Invalid points for ${submission.name} at ${submission.problemIndex}: ${submission.points}`);
            return false;
        }
    }

    return true;
}

let currentScreen = 0;

function startContest() {
    if (!validateJSON()) {
        return;
    }

    document.getElementById("input-screen").classList.toggle("hidden");
    document.getElementById("splash-screen").classList.toggle("hidden");
    currentScreen = 1;

    let pendingSubmissions = 0;
    const { contest, submissions } = JSON.parse(document.getElementById("json-data").value);
    submissions.forEach(submission => {
        if (submission.submitMinutes >= contest.durationMinutes - contest.freezeDurationMinutes) {
            pendingSubmissions++;
        }
    });

    document.getElementById("contest-name").textContent = contest.name;
    document.getElementById("pending-count").textContent = `${pendingSubmissions} pending submission${pendingSubmissions == 1 ? "" : "s"}`;
}

function formatScoreAndTime(score, submissionsBefore, submissionsAfter, submitMinutes) {
    return `${score} (${submissionsBefore} + ${submissionsAfter}, ${submitMinutes})`;
}

let penaltyPerSubmission = 20;

function getTotalPenalty(submitMinutes, submissionsBefore) {
    return submitMinutes + Math.max(submissionsBefore - 1, 0) * penaltyPerSubmission;
}

let isStarting = false;
let standings = [];
const problemIndex = {};
const problemScore = {};
let currentIndex = 0;
let currentAction = 0; // 0: Next user, 1: Next unfrozen problem, 2: Open unfrozen problem

function processContest() {
    isStarting = false;

    if (currentScreen == 1) {
        document.getElementById("splash-screen").classList.toggle("hidden");
        document.getElementById("output-screen").classList.toggle("hidden");
        currentScreen = 2;
    }

    const { contest, problems, contestants, submissions } = JSON.parse(document.getElementById("json-data").value);

    penaltyPerSubmission = contest.penaltyMinutes;

    problems.forEach((problem, index) => {
        problemIndex[problem.index] = index;
        problemScore[problem.index] = problem.points;
    });

    const standingsContainer = document.getElementById('standings');
    standingsContainer.innerHTML = "";

    standings = contestants.map(contestant => {
        const userSubmissions = submissions.filter(submission => submission.name == contestant.name);
        const userProblems = problems.map(problem => {
            const userProblemSubmissions = userSubmissions.filter(submission => submission.problemIndex == problem.index);
            const data = {
                index: problem.index,
                beforeFreeze: null,
                afterFreeze: null,
                submitAfterFreeze: false,
            }

            for (const submission of userProblemSubmissions) {
                if (submission.submitMinutes < contest.durationMinutes - contest.freezeDurationMinutes) {
                    if (data.beforeFreeze == null) {
                        if (submission.points > 0) {
                            data.beforeFreeze = [submission.points, submission.submitMinutes, 1, 0];
                        } else {
                            data.beforeFreeze = [0, 0, 0, 1];
                        }
                    } else {
                        if (submission.points > data.beforeFreeze[0]) {
                            data.beforeFreeze[0] = submission.points;
                            data.beforeFreeze[1] = submission.submitMinutes;
                            data.beforeFreeze[2] += data.beforeFreeze[3] + 1;
                            data.beforeFreeze[3] = 0;
                        } else {
                            data.beforeFreeze[3]++;
                        }
                    }

                    data.afterFreeze = [...data.beforeFreeze];
                } else {
                    data.submitAfterFreeze = true;
                    if (data.afterFreeze == null) {
                        if (submission.points > 0) {
                            data.afterFreeze = [submission.points, submission.submitMinutes, 1, 0];
                        } else {
                            data.afterFreeze = [0, 0, 0, 1];
                        }
                    } else {
                        if (submission.points > data.afterFreeze[0]) {
                            data.afterFreeze[0] = submission.points;
                            data.afterFreeze[1] = submission.submitMinutes;
                            data.afterFreeze[2] += data.afterFreeze[3] + 1;
                            data.afterFreeze[3] = 0;
                        } else {
                            data.afterFreeze[3]++;
                        }
                    }
                }
            }

            return data;
        });

        const totalScore = userProblems.reduce((acc, problem) => {
            if (problem.beforeFreeze) {
                acc += problem.beforeFreeze[0];
            }

            return acc;
        }, 0);

        const totalTime = userProblems.reduce((acc, problem) => {
            if (problem.beforeFreeze) {
                acc += getTotalPenalty(problem.beforeFreeze[1], problem.beforeFreeze[2]);
            }

            return acc;
        }, 0);

        return {
            rank: 0,
            name: contestant.name,
            logo: contestant.logo,
            rankCF: contestant.rank,
            problems: userProblems,
            totalScore,
            totalTime,
        };
    });

    standings.sort((a, b) => {
        if (a.totalScore != b.totalScore) {
            return b.totalScore - a.totalScore;
        }

        return a.totalTime - b.totalTime;
    });

    standings[0].rank = 1;
    for (let i = 1; i < standings.length; i++) {
        if (standings[i].totalScore == standings[i - 1].totalScore && standings[i].totalTime == standings[i - 1].totalTime) {
            standings[i].rank = standings[i - 1].rank;
        } else {
            standings[i].rank = i + 1;
        }
    }

    currentIndex = standings.length - 1;
    currentAction = 0;

    const rankToColor = {
        "newbie": "gray",
        "pupil": "green",
        "specialist": "cyan",
        "expert": "blue",
        "candidate master": "purple",
        "master": "orange",
        "international master": "orange",
        "grandmaster": "red",
        "international grandmaster": "red",
    }

    standings.forEach((user) => {
        const rankBox = document.createElement('div');
        rankBox.classList.add('rank-box');

        const rankDiv = document.createElement('div');
        rankDiv.classList.add('rank');
        rankDiv.textContent = user.rank;

        const logoDiv = document.createElement('img');
        logoDiv.classList.add('logo');
        logoDiv.src = user.logo || "img/default.png";
        logoDiv.loading = "lazy";
        logoDiv.onerror = "this.onerror=null; this.src='img/default.png'";

        const userInfoDiv = document.createElement("div");
        userInfoDiv.classList.add("user-info");

        const nameDiv = document.createElement("div");
        nameDiv.classList.add("name");
        nameDiv.textContent = user.name;
        if (user.rankCF) {
            nameDiv.style.color = rankToColor[user.rankCF];
            nameDiv.style.fontWeight = "bold";
        }

        const problemPointsDiv = document.createElement("div");
        problemPointsDiv.classList.add("problem-points");

        user.problems.forEach(problem => {
            const pointBox = document.createElement("div");
            pointBox.classList.add("point-box");
            if (problem.submitAfterFreeze) {
                pointBox.textContent = problem.beforeFreeze ? formatScoreAndTime(problem.beforeFreeze[0], problem.beforeFreeze[2], problem.afterFreeze[2] + problem.afterFreeze[3] - problem.beforeFreeze[2], problem.beforeFreeze[1]) : formatScoreAndTime(0, 0, problem.afterFreeze[2] + problem.afterFreeze[3], 0);
                pointBox.style.background = "#a7a70b";
                pointBox.style.color = "#ffffff";
            } else if (problem.beforeFreeze) {
                pointBox.textContent = formatScoreAndTime(problem.beforeFreeze[0], problem.beforeFreeze[2], problem.beforeFreeze[3], problem.beforeFreeze[1]);
                pointBox.style.background = getColorForScore(problem.beforeFreeze[0], problemScore[problem.index]);
                pointBox.style.color = "#ffffff";
            } else {
                pointBox.textContent = problem.index;
                pointBox.style.background = "#282828";
                pointBox.style.color = "##646464";
            }
            problemPointsDiv.appendChild(pointBox);
        });

        userInfoDiv.appendChild(nameDiv);
        userInfoDiv.appendChild(problemPointsDiv);

        const totalScoreDiv = document.createElement("div");
        totalScoreDiv.classList.add("total-score");
        totalScoreDiv.textContent = user.totalScore;

        const totalTimeDiv = document.createElement("div");
        totalTimeDiv.classList.add("total-time");
        totalTimeDiv.textContent = user.totalTime;

        rankBox.appendChild(rankDiv);
        rankBox.appendChild(logoDiv);
        rankBox.appendChild(userInfoDiv);
        rankBox.appendChild(totalScoreDiv);
        rankBox.appendChild(totalTimeDiv);

        standingsContainer.appendChild(rankBox);
    });

    isStarting = true;
}

const transitionStyle = "top 1s ease-in-out";

function getBoxByName(name) {
    const rankBoxes = document.querySelectorAll(".rank-box");
    for (let i = 0; i < rankBoxes.length; i++) {
        if (rankBoxes[i].querySelector(".name").textContent == name) {
            return rankBoxes[i];
        }
    }

    return null;
}

function run(auto = false) {
    return new Promise(resolve => {
        const scrollToBox = document.querySelectorAll(`.rank-box`)[Math.min(currentIndex + 1, standings.length - 1)];
        scrollToBox.scrollIntoView({ behavior: "smooth", block: "end" });

        if (currentAction == 0) {
            if (currentIndex < standings.length - 1) {
                const previousBox = document.querySelectorAll(`.rank-box`)[currentIndex + 1];
                previousBox.style.background = "transparent";
            }

            if (currentIndex == -1) {
                currentAction = -1;
                resolve();
                return;
            }

            const unfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.submitAfterFreeze);
            const currentBox = document.querySelectorAll(`.rank-box`)[currentIndex];
            currentBox.style.background = "#5782d9";

            if (unfrozenIndex == -1) {
                currentIndex--;
            } else {
                currentAction = 1;
            }

            setTimeout(() => {
                resolve();
            }, auto ? 500 : 0);
        } else if (currentAction == 1) {
            const unfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.submitAfterFreeze);
            if (unfrozenIndex == -1) {
                currentAction = 0;
                currentIndex--;
                setTimeout(() => {
                    resolve();
                }, auto ? 500 : 0);
            } else {
                const currentProblem = standings[currentIndex].problems[unfrozenIndex];
                const currentBox = document.querySelectorAll(`.rank-box`)[currentIndex];
                const problemPointsDiv = currentBox.querySelector(".problem-points");
                const problemBox = problemPointsDiv.children[problemIndex[currentProblem.index]];
                problemBox.style.borderColor = "lightgray";
                currentAction = 2;

                setTimeout(() => {
                    resolve();
                }, auto ? 500 : 0);
            }
        } else if (currentAction == 2) {
            const unfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.submitAfterFreeze);
            const currentProblem = standings[currentIndex].problems[unfrozenIndex];
            const currentBox = document.querySelectorAll(`.rank-box`)[currentIndex];
            const problemPointsDiv = currentBox.querySelector(".problem-points");
            const problemBox = problemPointsDiv.children[problemIndex[currentProblem.index]];
            const totalScoreDiv = currentBox.querySelector(".total-score");
            const totalTimeDiv = currentBox.querySelector(".total-time");
            problemBox.textContent = formatScoreAndTime(currentProblem.afterFreeze[0], currentProblem.afterFreeze[2], currentProblem.afterFreeze[3], currentProblem.afterFreeze[1]);
            problemBox.style.background = getColorForScore(currentProblem.afterFreeze[0], problemScore[currentProblem.index]);
            problemBox.style.color = "#ffffff";
            totalScoreDiv.textContent = standings[currentIndex].totalScore += currentProblem.afterFreeze[0] - (currentProblem.beforeFreeze ? currentProblem.beforeFreeze[0] : 0);
            totalTimeDiv.textContent = standings[currentIndex].totalTime += getTotalPenalty(currentProblem.afterFreeze[1], currentProblem.afterFreeze[2]) - (currentProblem.beforeFreeze ? getTotalPenalty(currentProblem.beforeFreeze[1], currentProblem.beforeFreeze[2]) : 0);
            currentProblem.submitAfterFreeze = false;
            problemBox.style.borderColor = "transparent";

            let newIndex = currentIndex;
            for (let i = currentIndex; i >= 0; i--) {
                if (standings[currentIndex].totalScore > standings[i].totalScore || (standings[currentIndex].totalScore == standings[i].totalScore && standings[currentIndex].totalTime < standings[i].totalTime)) {
                    newIndex = i;
                }
            }

            const user = standings.splice(currentIndex, 1)[0];
            standings.splice(newIndex, 0, user);

            for (let i = newIndex; i < standings.length; i++) {
                if (i == 0) {
                    standings[i].rank = 1;
                } else {
                    if (standings[i].totalScore == standings[i - 1].totalScore && standings[i].totalTime == standings[i - 1].totalTime) {
                        standings[i].rank = standings[i - 1].rank;
                    } else {
                        standings[i].rank = i + 1;
                    }
                }

                const rankBox = getBoxByName(standings[i].name);
                rankBox.querySelector(".rank").textContent = standings[i].rank;
            }

            if (newIndex != currentIndex) {
                currentBox.style.transition = transitionStyle;
                currentBox.style.top = `${70 * (newIndex - currentIndex)}px`;
                for (let i = currentIndex - 1; i >= newIndex; i--) {
                    const box = document.querySelectorAll(`.rank-box`)[i];
                    box.style.transition = transitionStyle;
                    box.style.top = "70px";
                }

                setTimeout(() => {
                    const rankContainer = document.getElementById('standings');
                    rankContainer.insertBefore(currentBox, rankContainer.children[newIndex]);
                    for (let i = currentIndex; i >= newIndex; i--) {
                        const box = document.querySelectorAll(`.rank-box`)[i];
                        box.style.transition = "none";
                        box.style.top = "";
                    }

                    document.querySelectorAll(`.rank-box`)[newIndex].style.background = "transparent"
                    document.querySelectorAll(`.rank-box`)[currentIndex].style.background = "#5782d9";

                    const nextUnfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.submitAfterFreeze);
                    if (nextUnfrozenIndex == -1) {
                        currentIndex--;
                        currentAction = 0;
                    } else {
                        currentAction = 1;
                    }

                    setTimeout(() => {
                        resolve();
                    }, auto ? 500 : 0);
                }, 1000);
            } else {
                const nextUnfrozenIndex = standings[currentIndex].problems.findIndex(problem => problem.submitAfterFreeze);
                if (nextUnfrozenIndex == -1) {
                    currentIndex--;
                    currentAction = 0;
                } else {
                    currentAction = 1;
                }

                setTimeout(() => {
                    resolve();
                }, auto ? 500 : 0);
            }
        }
    });
}

let isRunning = false;

document.addEventListener("keydown", async function (event) {
    if (currentScreen == 1) {
        if (event.key == 'Enter') {
            processContest();
        }

        return;
    }

    if (!isStarting || isRunning) {
        return;
    }

    isRunning = true;

    if (event.key == 'n' || event.key == 'N') {
        await run();
    } else if (event.key == 'a' || event.key == 'A') {
        while (currentIndex >= 0 || currentAction == 0) {
            await run(true);
        }
    } else if (event.key == 'r' || event.key == 'R') {
        processContest();
    }

    isRunning = false;
});