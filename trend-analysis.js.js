const axios = require("axios");
const fs = require("fs");
const { configDotenv } = require("dotenv");
configDotenv();
const { parseCsvFile, writeJsonToCsv, writeJsonToFile} = require("./helpers/csv-parser");

const EFFICIENCY = 0.75;
// Replace with your API endpoint

// Define parameters for the API call if required (modify as needed)
const users = JSON.parse(
  fs.readFileSync("clickup-user-data/user-metadata.json")
);

async function fetchData() {
  const userAttendanceJson = await parseCsvFile(
    "clickup-user-data/user-attendance.csv"
  );
  const userAttendanceMap = {};
  userAttendanceJson.forEach((u) => {
    const emailPrefix = u.EmailId.split("@")[0];
    userAttendanceMap[emailPrefix] = {
      totalPresentDays: parseFloat(u.Oct2024) + parseFloat(u.Nov2024) + parseFloat(u.Dec2024),
      name: u.EmployeeName,
      email: u.EmailId,
      emailPrefix: emailPrefix,
    };
  });
  const userOutputData = [];
  for (const user of users) {
    try {
      const userTasks = [];
      let lastPage = false;
      let count = 0;
      console.log("Getting Data for", user.userName, new Date());
      while (!lastPage) {
        try {
          console.log(`Making API call: ${count}`, new Date());
          var config = {
            method: "get",
            url: `https://api.clickup.com/api/v2/team/3409307/task?assignees%5B%5D=${user.clickUpId}&include_closed=true&date_created_gt=1727740800000&date_created_lt=1735603200000&page=${count}`,
            headers: {
              Authorization: process.env.CLICKUP_ACCESS_TOKEN,
              accept: "application/json",
            },
          };

          const { data } = await axios(config);
          userTasks.push(...data.tasks);
          lastPage = data.last_page;
          count++;
        } catch (error) {
          console.error(`Error fetching data for page:`, error.message);
          userTasks.push({ error: error.message });
        }
      }
      const fileName = user.userName.split(" ").join(".");
      fs.writeFileSync(
        `clickup-user-data/${fileName}.json`,
        JSON.stringify(userTasks, null, 2)
      );
      const userTaskData = userTasks.reduce(
        (prev, next) => {
          if (next.time_spent) {
            prev.timeTrackedInMs += next.time_spent;
          } else {
            console.log("Time Spent not found for", next.custom_id, next.id);
          }
          prev.taskCount += 1;
          if (next.points) {
            prev.sprintPoints += next.points;
          } else {
            console.log("Sprint Points not found for", next.custom_id, next.id);
          }
          return prev;
        },
        { timeTrackedInMs: 0, taskCount: 0, sprintPoints: 0 }
      );

      function  calculatePercentage(data, field, invalidValue) {
        const totalCount = data.length;
        const validCount = data.filter(
          (item) => item[field] !== invalidValue
        ).length;
        return (validCount / totalCount) * 100;
      }

      const descriptionPercentage = calculatePercentage(
        userTasks,
        "description",
        ""
      );
      const pointsPercentage = calculatePercentage(userTasks, "points", null);

      const timeTrackedPercentage = calculatePercentage(
        userTasks,
        "time_spent",
        undefined
      );

      const dueDatePercentage = calculatePercentage(
        userTasks,
        "due_date",
        null
      );

      const finalDescriptionPercentage =
        descriptionPercentage >= 100
          ? 10
          : (descriptionPercentage * 10) / 100;

      // const finalStoryPercentage =
      //   pointsPercentage >= 50 ? 6.25 : (pointsPercentage * 6.25) / 100;

      const finalTimeTrackPercentage =
        timeTrackedPercentage >= 100
          ? 10
          : (timeTrackedPercentage * 10) / 100;

      const finalDueDatePercentage =
        dueDatePercentage >= 100 ? 10 : (dueDatePercentage * 10) / 100;

      const emailPrefix = user.userName.split(" ").join(".");
      userTaskData.timeTrackedInHrs = parseFloat(
        (userTaskData.timeTrackedInMs / (1000 * 60 * 60)).toFixed(2)
      );
      userTaskData.totalWorkingHours =
        userAttendanceMap[emailPrefix].totalPresentDays * 8.5;
      const efficiency =
        userTaskData.timeTrackedInHrs / (userTaskData.totalWorkingHours * EFFICIENCY) *
        100;
      userTaskData.efficiencyPercentage = efficiency > 100 ? 70 : (efficiency * 70) / 100;

      const finalPer =
        finalDescriptionPercentage +
        finalTimeTrackPercentage +
        finalDueDatePercentage +
        userTaskData.efficiencyPercentage;
      delete user._id;
      userOutputData.push({
        ...user,
        ...userAttendanceMap[emailPrefix],
        ...userTaskData,
        efficiencyPercentage: userTaskData.efficiencyPercentage.toFixed(2),
        descriptionAdoptionRate: finalDescriptionPercentage.toFixed(2),
        timeTrackedAdoptionRate: finalTimeTrackPercentage.toFixed(2),
        dueDateAdoptionRate: finalDueDatePercentage.toFixed(2),
        totalAdoptionRate: finalPer.toFixed(2),
      });
    } catch (error) {
      console.error(`Error fetching data for user :`, error.message);
    }
    await sleep();
  }

  fs.writeFileSync(
    `clickup-user-data/all-user-summary.json`,
    JSON.stringify(userOutputData, null, 2)
  );
  await writeJsonToCsv(userOutputData, 'clickup-user-data/all-user-summary.csv')
}

// Execute the function
// fetchData();

const sleep = async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};

const getAllTasks = async () => {
  const allTasks = [];
  try {

    const monthGaps = [{
      startDate: new Date('2024-04-01'),
    }, {
      startDate: new Date('2024-05-01'),
    }, {
      startDate: new Date('2024-06-01'),
    }, {
      startDate: new Date('2024-07-01'),
    }, {
      startDate: new Date('2024-08-01'),
    }, {
      startDate: new Date('2024-09-01'),
    }, {
      startDate: new Date('2024-10-01'),
    }, {
      startDate: new Date('2024-11-01'),
    }, {
      startDate: new Date('2024-12-01'),
    }, {
      startDate: new Date('2025-01-01'),
    }]
    for(const [index, gap] of monthGaps.entries()) {
      if(monthGaps.length - 1 === index) {
        continue;
      }
      console.log("Getting Data", gap.startDate,  new Date());
      let lastPage = false;
      let count = 0;
      const startDate = (new Date(gap.startDate)).getTime()
      const endDate = (new Date(monthGaps[index + 1].startDate)).getTime()
      while (!lastPage) {
        try {
          console.log(`Making API call: ${count}`, new Date());
          var config = {
            method: "get",
            url: `https://api.clickup.com/api/v2/team/3409307/task?include_closed=true&date_created_gt=${startDate}&date_created_lt=${endDate}&page=${count}`,
            headers: {
              Authorization: process.env.CLICKUP_ACCESS_TOKEN,
              accept: "application/json",
            },
          };
          const {data} = await axios(config);
          allTasks.push(...data.tasks);
          lastPage = data.last_page;
          count++;
        } catch (error) {
          console.error(`Error fetching data for page:`, error.message);
          userTasks.push({error: error.message});
        }
      }
      await sleep();
    }
    fs.writeFileSync(
      `all-user-tasks.json`,
      JSON.stringify(allTasks, null, 2)
    );
  } catch (error) {
    console.error(`Error fetching data for page:`, error.message);
    allTasks.push({error: error.message});
  }
};
// getAllTasks()

const prepareData = async () => {
  try {
    const allKevitTasks = JSON.parse(
      fs.readFileSync("all-user-tasks.json")
    );
    // console.log(allKevitTasks.length)
    // console.log(allKevitTasks[0])
    let allTasks = filterTasksByUsers(allKevitTasks);

    allTasks = allTasks.map(t => {
      const createdAt = new Date(Number(t.date_created))
      t.taskMonth = createdAt.getMonth() + 1
      t.taskDate = createdAt.getDate()
      return t;
    })
    console.log(allTasks.length)
    console.log(allTasks[0])

    const months = [4,5,6,7,8,9,10,11,12];
    const monthTimeData = {}
    months.forEach(m => {
      const monthTasks = allTasks.filter(t => t.taskMonth === m);
      const timeTrackedInMs = monthTasks.reduce(
        (prev, next) => {
          if (next.time_spent) {
            prev += next.time_spent;
          }
          return prev;
        },
        0
      );
      const timeTrackedInHrs = timeTrackedInMs/ (1000 * 60 * 60)
      const userDaySpecificAverage = timeTrackedInHrs / (52 * 20);
      monthTimeData[m] = {
        taskCount: monthTasks.length,
        totalTimeTrackedHrs: timeTrackedInHrs,
        userDaySpecificAverage
      }
    })
    const flatMonthData = Object.entries(monthTimeData).map(([month, metrics]) => ({
      Month: parseInt(month),
      TaskCount: metrics.taskCount,
      TotalTimeTrackedHrs: metrics.totalTimeTrackedHrs,
      UserDaySpecificAverage: metrics.userDaySpecificAverage
    }));
    writeJsonToFile(flatMonthData, 'graph-2-month-wise-avg.json')
    await writeJsonToCsv(flatMonthData, 'graph-2-month-wise-avg.csv')

    const monthProjectData = {}
    months.forEach(month => {
      const monthTasks = allTasks.filter(task => task.taskMonth === month);

      monthTasks.forEach(task => {
        const folderName = task.folder.name; // Project/Folder Name
        const timeTracked = task.time_spent || 0; // Time spent in ms

        if (!monthProjectData[folderName]) {
          monthProjectData[folderName] = {};
        }

        if (!monthProjectData[folderName][month]) {
          monthProjectData[folderName][month] = 0;
        }

        monthProjectData[folderName][month] += timeTracked / (1000 * 60 * 60); // Convert ms to hours
      });
    });

// Convert to JSON for CSV export
    const jsonData = [];

// Iterate over months to structure the data
    months.forEach(month => {
      const row = { Month: month };

      // Add time tracked for each folder (project)
      Object.keys(monthProjectData).forEach(folder => {
        row[folder] = monthProjectData[folder][month] || 0; // Default to 0 if no data
      });

      jsonData.push(row);
    });

// Log the JSON for debugging
    console.log(jsonData);
    writeJsonToFile(jsonData, 'graph-3-project-wise-avg.json')
    await writeJsonToCsv(jsonData, 'graph-3-project-wise-avg.csv')

  } catch (error) {
    console.error(`Error fetching data for page:`, error.message);
  }
}

const filterTasksByUsers = (tasks) => {
  // Extract ClickUp IDs of users
  const userClickUpIds = users.map(user => user.clickUpId);

  // Filter tasks where any assignee's id matches the user IDs
  const filteredTasks = tasks.filter(task =>
    task.assignees.some(assignee => userClickUpIds.includes(assignee.id.toString()))
  );

  return filteredTasks;
};
prepareData()
