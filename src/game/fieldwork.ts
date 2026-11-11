/** Optional, non-economic observations. Cosmetic weather never gates completion. */
export const SURVEY_IDS = ['oak','birch','fruit'] as const;
export type SurveyId = typeof SURVEY_IDS[number];
export const SURVEY_CHOICES = ['broad-crown','pale-bark','round-fruit'] as const;
export type SurveyChoice = typeof SURVEY_CHOICES[number];
export const CHOICE_LABELS:Record<SurveyChoice,string> = {
 'broad-crown':'A broad, layered crown', 'pale-bark':'A pale trunk with dark marks', 'round-fruit':'Round fruit among the leaves'
};
export const SURVEYS = {
 oak:{name:'Square shade tree',question:'What makes this tree easiest to recognize?',hint:'Look at the spreading shape of its crown. The tree has declined to submit an organizational chart.',answer:'broad-crown',point:{x:18,y:28.5},doorArea:[17,25.5,2,3],note:'Oak study — a broad crown, branching trunk, and a very relaxed approach to deadlines.'},
 birch:{name:'Pale-barked tree',question:'Which detail would you put in a field sketch?',hint:'Look closely at the light-colored trunk and its dark little marks. This is bark, not a barcode.',answer:'pale-bark',point:{x:35,y:28.5},doorArea:[34,25.5,2,3],note:'Birch study — pale bark and dark marks. Nature has invented office stationery.'},
 fruit:{name:'Corner fruit tree',question:'What distinguishes this tree from its neighbors?',hint:'The round shapes in the leaves are fruit. Harvesting and orchards are a later system; looking is free.',answer:'round-fruit',point:{x:38,y:35.5},doorArea:[37,32.5,2,3],note:'Fruit-tree study — fruit among the leaves. The harvest policy is still being drafted.'}
} as const;
export function surveyId(value:string):SurveyId|undefined{return (SURVEY_IDS as readonly string[]).includes(value)?value as SurveyId:undefined;}
