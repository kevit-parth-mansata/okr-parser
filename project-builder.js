const path = require('path');
const date = require('date-and-time');
const {parseCsvFile, writeJsonToCsv, writeJsonToFile} = require("./helpers/csv-parser");

const buildProjectJson = async () => {
  try {
    const filePath = path.join(__dirname, 'service-employees.csv');
    const userJson = await parseCsvFile(filePath);
    const projects = {};
    userJson.forEach(u => {
      if (u['Project 1']) {
        if (!projects[u['Project 1']]) {
          projects[u['Project 1']] = []
        }
        const member = {name: u['Employee Name']};
        if (u['Start Date'] && u['End Date']) {
          member.startDate = date.format(date.parse(u['Start Date'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
          member.endDate = date.format(date.parse(u['End Date'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
        }
        projects[u['Project 1']].push(member)
      }
      if (u['Project 2']) {
        if (!projects[u['Project 2']]) {
          projects[u['Project 2']] = []
        }
        const member = {name: u['Employee Name']};
        if (u['Start Date2'] && u['End Date3']) {
          member.startDate = date.format(date.parse(u['Start Date2'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
          member.endDate = date.format(date.parse(u['End Date3'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
        }
        projects[u['Project 2']].push(member)
      }
      if (u['Project 3']) {
        if (!projects[u['Project 3']]) {
          projects[u['Project 3']] = []
        }
        const member = {name: u['Employee Name']};
        if (u['Start Date4'] && u['End Date5']) {
          member.startDate = date.format(date.parse(u['Start Date4'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
          member.endDate = date.format(date.parse(u['End Date5'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
        }
        projects[u['Project 3']].push(member)
      }
      if (u['Project 4']) {
        if (!projects[u['Project 4']]) {
          projects[u['Project 4']] = []
        }
        const member = {name: u['Employee Name']};
        if (u['Start Date6'] && u['End Date7']) {
          member.startDate = date.format(date.parse(u['Start Date6'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
          member.endDate = date.format(date.parse(u['End Date7'], 'YYYY-MM-DD'), 'YYYY-MM-DD')
        }
        projects[u['Project 4']].push(member)
      }
    })
    console.log('Processed Projects to object, saving Array');
    const projectsArr = [];
    for (const project in projects) {
      projectsArr.push({projectName: project, members: projects[project]});
    }
    await writeJsonToFile(projectsArr, 'projects-1.json')
  } catch (e) {
    console.log(e)
  }
}

buildProjectJson();
