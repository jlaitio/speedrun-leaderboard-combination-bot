import 'source-map-support/register';

import { UserMapping } from './types/runs';

import { getCombinedRuns } from './data';
import { sendToWiki, getExtraUserMappingFromWiki } from './wiki';

const dryRun = false;

export const postCombinedLeaderboardsToWiki = async () => {
  console.log('postCombinedLeaderboardsToWiki start')
  try {    
    const extraUserMapping: Array<UserMapping> = await getExtraUserMappingFromWiki()
    const runs = await getCombinedRuns(extraUserMapping, dryRun);
    await sendToWiki(runs, dryRun);
  }    
  catch (err) {
    console.error('Unhandled error', err);
  }
  console.log('postCombinedLeaderboardsToWiki finish')
}

