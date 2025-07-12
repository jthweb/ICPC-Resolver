# ICPC Resolver in HTML

The ICPC Resolver is a tool designed to simulate the frozen period of an ICPC-style contest, revealing the final submissions' results in an interesting way before displaying the final standings. The concept and design are inspired by the [official ICPC Resolver](https://tools.icpc.global/resolver/).

----

## Usage

### Open the tool

You can access the tool at [jthweb.github.io/ICPC-Resolver](https://jthweb.github.io/ICPC-Resolver/). You can either use it online or clone the repository and open the `index.html` file in your browser.

### Prepare the data

You can choose between two ways to input the data:

#### Raw JSON

The input JSON should have the format as the following example:

```json
{
  "contest": {
    "name": "Blue Contest",
    "durationMinutes": 60,
    "freezeDurationMinutes": 30,
    "penaltyMinutes": 20
  },
  "problems": \[
    {"index": "A",
      "points": 1
    }
  ],
  "contestants": \[
    {
      "name": "MIT",
      "logo": "img/mit.png",
      "rank": "novice"
    },
    {
      "name": "CMU",
      "logo": "img/cmu.png",
      "rank": "novice"
    },
    {
      "name": "Havard",
      "logo": "img/havard.png",
      "rank": "novice"
    }
  ],
  "submissions": \[
    {
      "name": "MIT",
      "problemIndex": "A",
      "submitMinutes": 10,
      "points": 0
    },
    {
      "name": "CMU",
      "problemIndex": "A",
      "submitMinutes": 20,
      "points": 1
    },
    {
      "name": "MIT",
      "problemIndex": "A",
      "submitMinutes": 30,
      "points": 1
    },
    {
      "name": "Havard",
      "problemIndex": "A",
      "submitMinutes": 50,
      "points": 0
    }
  ]
}
```



Explanation:

* `contest`: Information of the contest.

  * `contest.name`: Name of the contest.
  * `contest.durationMinutes`: Duration of the contest in minutes.
  * `contest.freezeDurationMinutes`: Duration of the frozen period in minutes.
  * `contest.penaltyMinutes`: Penalty in minutes for each submission before the first highest positive score submission for each problem.

* `problems`: Information of the problems.

  * `problems.index`: Index of the problem.
  * `problems.points`: Points for each correct answer (1)

* `contestants`: Information of the contestants.

  * `contestants.name`: Name of the contestant.
  * `contestants.logo` (*optional*): Path to the logo of the contestant.
  * `contestants.rank` (*optional*): Codeforces rank of the contestant.

* `submissions`: Information of the submissions.

  * `submissions.name`: Name of the contestant.
  * `submissions.problemIndex`: Index of the problem.
  * `submissions.submitMinutes`: Time elapsed from the start of the contest until the submission in minutes.
  * `submissions.points`: 1 point for correct answers and 0 points for wrong answers.



Two python files - `small\_generate.py` and `large\_generate.py` generate small or large example data for the resolver and exports them as `resolver.json` in the same directory. You can use this to generate example data for the resolver. (not the actual data)

The python files only generate a simulated contest, with teams and other submissions artificially generated.

For a real contest, please fill in the json file yourself using your contest data. (This web app does not use the `event-feed.json` format as done by the original ICPC resolver)



#### Codeforces contest

You can only use this for Codeforces contests where **you are the manager**. You need to provide the contest ID along with your API key and secret from the [Codeforces API](https://codeforces.com/settings/api). After you input the data, the tool will fetch contest data and convert it into the above JSON format. It supports both OI and ICPC-style contests.

When using the Codeforces API, the maximum points for each problem are not included in the response for private contests. The tool will set it to 100 for OI-style contests and 1 for ICPC-style contests. You can manually change it in the JSON data if needed.

### Control the resolver

If you successfully click the submit button, a splash screen will appear. Press `Enter` to start the resolver. Then, you can use the following keys:

* Press `N` to move to the **N**ext submission.
* Press `A` to **A**uto-play the resolver.
* Press `R` to **R**eset the resolver.

## Notes

* The tool is designed to be used on a desktop or laptop. It may not work well on mobile devices.
* If there are many problems, the content of the point box may overflow. You can try zooming out the page to fix this.
* If smooth scrolling is not working, enable it in the browser settings (e.g. `chrome://flags/#smooth-scrolling`).
* If the contestant's logo is not displayed, make sure the path is correct, or try pressing `R` to reset the resolver.
* You can run a test version using the data from [test\_data.json](test_data.json).

## Contributing

If you find any bugs or have any suggestions, feel free to open an issue or a pull request.

## Licence

This project is licenced under the GNU GPLv3 (See [LICENSE](license) for more details). You are free to edit and repulish this as long as you credit the creator. (here, me!)

