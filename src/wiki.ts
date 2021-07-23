import * as fs from 'fs';
import moment from 'moment';
import { Category, PlacedRun, CategoryRuns, UserMapping } from './types/runs';
import { getSsmSecret } from './utils';
import wikiConfig from '../config/wiki-config.json';
import extraUserMapping from '../config/extra-user-mapping.json';

const toWikiFormat = (category: Category, runs: PlacedRun[]) => `

= [[${category.name}|${category.name}]] =

{| class="wikitable sortable" style="text-align:center" cellpadding="20"
! scope="col" width="30" | Place
! scope="col" width="60" | Runner
! scope="col" width="60" | Real Time
! scope="col" width="100" | Date
! scope="col" width="60" | Link
! scope="col" width="80" | Source
! Comment
${runs.map((run: PlacedRun) => `|-
| ${run.place} || ${run.name} || ${run.rta} || ${run.date} || ${run.video ? `[${run.video} Link]` : ''} || ${run.source} || ${run.comment}
`).join('')}|}
`;

const doWikiOperation = async <T>(operation: (client) => Promise<T>): Promise<T> => {
  const [username, password] = await Promise.all([
    getSsmSecret(wikiConfig.usernameSsmParameter),
    getSsmSecret(wikiConfig.passwordSsmParameter),
  ])

  const bot = require('nodemw');
  const client = new bot({
    protocol: wikiConfig.protocol,
    server: wikiConfig.server,
    path: '',
    debug: true
  });

  return new Promise((resolve, reject) => {
    client.logIn(username, password, (err) => {
      if (err) reject(err);
      else {
        resolve(operation(client));
      }
    });
  });
}

export const getExtraUserMappingFromWiki = async (): Promise<UserMapping[]> => {
  console.log('Fetching extra user mapping from wiki')
  const op: ((client) => Promise<Array<UserMapping>>) = client => new Promise((resolve, reject) => {
      client.getArticle(wikiConfig.extraUserMappingPageTitle, ((err, data) => {
        if (err) reject(err);
        else {
          // Parse all 2-width table rows in wiki page and create mapping
          // TODO use an actual parsing library instead of a somewhat error prone regex
          const wikiExtraUserMapping = data.split('\n').map(r => {
            const p = r.match(/\|\s*(.*?)\s*\|\|\s*(.*)/);
            if (p && p.length === 3) return {
              dtName: p[1],
              srcName: p[2],
            };
            else return undefined;
          }).filter(Boolean);

          if (!wikiExtraUserMapping || wikiExtraUserMapping.length === 0 ) {
            console.error('Got no extra user mapping data from wiki, using built-in', err);
            resolve(extraUserMapping)
          }
          else {
            resolve(wikiExtraUserMapping)
          }
        }
      }));
    })
  
  const result = doWikiOperation(op).catch((err) => {
    console.error('Error getting extra user mapping from wiki, using built-in', err);
    return extraUserMapping;
  });

  return result;
}

export const sendToWiki = async (runsByCategory: Array<CategoryRuns>, dryRun: boolean) => {
  const wikiHeader = `
__FORCETOC__

Automatically generated combination of external leaderboards. '''Do not modify this page manually''', your changes will be overwritten by a bot. Duplicates are removed mainly according to the table in [[Combined_Leaderboard_User_Mapping|this page]]. Generation done daily.

Sources used: [https://www.speedrun.com/ Speedrun.com] (SRC), [http://deertier.com DeerTier.com] (DT)

Current data generated at ${moment().format()}

`;

  const wikiContent = wikiHeader + runsByCategory
    .map(categoryRuns => toWikiFormat(categoryRuns.category, categoryRuns.runs))
    .join('');

  

  if (dryRun) {
    console.log('Content generated, writing to file');
    fs.writeFileSync('./wikiContent.md', wikiContent);
  } else {
    console.log('Content generated, posting to Wiki');

    const op = (client) => {
      return new Promise((resolve, reject) => {
        client.edit(wikiConfig.pageTitle, wikiContent, 'SilutionBot automatic edit', false, ((err, data) => {
          if (err) reject(err);
          else resolve(data);
        }))
      })
    }
  
    return doWikiOperation(op);
  }
}