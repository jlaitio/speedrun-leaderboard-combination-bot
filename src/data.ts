import * as fs from 'fs';
import moment from 'moment';
import fetch from 'node-fetch';
import * as _ from 'lodash';
import { toSeconds, toRta } from './utils';

import { Category, Run, PlacedRun, RunSource, CategoryRuns, UserMapping } from './types/runs';

const srcGameId = 'm1zoemd0';

const categories: Array<Category> = [
  {
    name: 'Any%',
    dtCategoryId: 'AnyPercentRealTime',
    srcCategoryId: '9d8v96lk'
  },
  {
    name: '100%',
    dtCategoryId: 'OneHundredPercent',
    srcCategoryId: 'xd1mpewd'
  },
  {
    name: 'Low% Ice',
    dtCategoryId: 'LowPercentIce',
    srcCategoryId: 'rklgyq8d',
    srcVariableKey: 'onv6jzw8',
    srcVariableValue: '4lx07prl',
  },
  {
    name: 'RBO',
    dtCategoryId: 'RBO',
    srcCategoryId: 'ndx8qmvk'
  },
  {
    name: 'GT Classic',
    dtCategoryId: 'GTClassic',
    srcCategoryId: 'wdmqjw32',
    srcVariableKey: 'kn02d083',
    srcVariableValue: '81w422oq',
  },
];

const dtDataPromise = fetch('https://deertier.com/api/records').then(res => res.json())

const runSources: Array<RunSource> = [{
  name: 'deertier.com',
  getRuns: async (category: Category, extraUserMapping: Array<UserMapping>): Promise<Array<Run>> => {
    return (await dtDataPromise)
      .filter(run => run.Category === category.dtCategoryId)
      .map(run => {
        // User SRC name for runner if present in mapping, as runners can have multiple
        // names on DT but normally not on SRC
        const dtName = run.Username.trim();
        const srcUserMapping = extraUserMapping.find(eum => eum.dtName === dtName);
        const srcName = srcUserMapping && srcUserMapping.srcName;
        const name = srcName || dtName;
        const date: string | null = (()=>{
          if (!run.DateSubmitted) return null;
          const dateM = moment(parseInt(run.DateSubmitted.match(/\/Date\((\d+)\)\//)[1]));
          if (dateM.isValid()) return dateM.format('YYYY-MM-DD');
          else return null;
        })();
        return {
          name,
          video: run.VideoUrl,
          comment: run.Comment,
          date,
          rta: run.RealTime,
          time: toSeconds(run.RealTime),
          source: 'DT',
        };
      });
  }
}, {
  name: 'speedrun.com',
  getRuns: async (category: Category, _extraUserMapping: Array<UserMapping>): Promise<Array<Run>> => {
    const url = `https://www.speedrun.com/api/v1/leaderboards/${srcGameId}/category/${category.srcCategoryId}?embed=players`;
    const json = await fetch(url).then(res => res.json());
    const playersById = json.data.players.data.reduce((acc, c) => {
      const id = c.id;
      const name = c.names && (c.names.international || c.names.japanese);
      if (id && name) {
        return {
          ...acc,
          [id]: name,
        };
      } else {
        return acc;
      }
    }, {});

    const allRuns = json.data.runs.map(runw => runw.run);
    const runs = (category.srcVariableKey && category.srcVariableValue)
      ? allRuns.filter(run => _.get(run, `values.${category.srcVariableKey}`) === category.srcVariableValue)
      : allRuns;

    return runs.map((run) => {
      // Get player name from run (if guest) or precalculated mapping (if reference)
      const rawName = _.get(run, 'players[0].name');
      const userId = _.get(run, 'players[0].id');
      const name = rawName || playersById[userId] || '';

      const video = _.get(run, 'videos.links[0].uri');
      const comment = run.comment || '';
      const date = run.date;
      const time = run.times.realtime_t;
      return {
        name, time, video, comment, date,
        rta: toRta(time),
        source: 'SRC',
      };
    });
  }
}]

export const getCombinedRuns = async (extraUserMapping: Array<UserMapping>, dryRun: boolean) => {
  const categoryResults: Array<CategoryRuns> = await Promise.all(categories.map(async (category) => {
    const allRunsBySource = await Promise.all(runSources.map(runSource => runSource.getRuns(category, extraUserMapping)));
    const allRuns = allRunsBySource.reduce((a, c) => [...a, ...c], []);

    // Delete duplicates / weaker runs by the same runner (by case insensitive name)
    const runnerNames = _.uniq(allRuns.map(run => run.name.toLowerCase()));
    const unsortedRuns = runnerNames.reduce((acc, name) => {
      const runsByRunner = allRuns.filter(run => run.name.toLowerCase() === name);
      const bestRun = _.minBy(runsByRunner, 'time');
      return [...acc, bestRun];
    }, []);

    const unplacedRuns: Array<Run> = _.sortBy(unsortedRuns, 'time', 'date').filter(run => run.time !== 0);

    // Check for potential duplicates and output them to log
    unplacedRuns.filter(r => r.source === 'SRC').forEach(run => {
      const dups = unplacedRuns.filter(r => (
        (r.rta === run.rta && r.date === run.date)
        || (r.video === run.video && r.video && r.video.length > 0)
        || (r.comment === run.comment && r.comment
          && r.comment.length > 20 && r.comment !== 'D e e R F o r C e'))
        && r.source !== run.source);
      if (dups.length > 0) console.log(`Possible dupe user mapping: ${JSON.stringify({
        srcName: run.name,
        dtName: dups[0].name
      })}`);
    });

    // Properly generate place numbers in case of ties
    const runs: PlacedRun[] = unplacedRuns.reduce((acc, cur, i) => {
      const prev = (acc.length > 0) ? acc[acc.length - 1] : null;
      const place = (prev && prev.time === cur.time) ? prev.place : (i + 1);
      const placedRun = { ...cur, place };
      return [...acc, placedRun];
    }, [])

    if (dryRun) {
      fs.writeFileSync(`./runs_${category.srcCategoryId}.json`, JSON.stringify(runs, null, 2));
    }

    return {
      category,
      runs
    };
  }));

  return categoryResults;
};