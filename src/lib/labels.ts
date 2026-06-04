// A file containing the mappings for each of the labels to apply to videos upon validation when 
import { Flag } from "./types"

export type eligibilityType = "eligible" | "maybe ineligible" | "ineligible"

export const stampMap: Record<eligibilityType, { severity: number, icon: string }> = {
	ineligible: 		{ severity: 2, icon: "x.svg" 	     },
	eligible: 			{ severity: 0, icon: "checkmark.svg" },
	"maybe ineligible": { severity: 1, icon: "warn.svg"  	 },
}

export type label_key =
	"invalid_link" |
	"duplicate_votes" |
	"missing_id" |
	"unavailable" |
	"zero_votes" |
	"sub_5_votes" |
	"wrong_period" |
	"edge_date" |
	"too_short" |
	"maybe_too_short" |
	"no_simping" |
	"unsupported_site" |
	"littleshy_vid"

/**
 * Use this when only fields other than those updatable by the operator are used, since these will only ever have the default values
 */
export let labels: Record<label_key, Flag> = {
    invalid_link:     { name: 'Invalid link',       type: 'ineligible', 	  trigger: 'Non url entry',               details: 'Not a valid link' },
	duplicate_votes:  { name: 'Duplicate vote',     type: 'ineligible', 	  trigger: 'Duplicate links in ballot',   details: 'Duplicate votes are not eligible' },
	missing_id:       { name: 'Missing id',         type: 'ineligible', 	  trigger: 'No video id in link',         details: 'No video id present' },
	unavailable:      { name: 'Unavailable video',  type: 'ineligible', 	  trigger: 'Empty metadata response',     details: 'Video is not public or is unavailable' },
	zero_votes:		  { name: 'No votes',			type: 'ineligible',		  trigger: 'Empty ballot',				  details: 'At least 1 eligible vote required to submit' },
	sub_5_votes:      { name: '1a',                 type: 'maybe ineligible', trigger: '<5 eligible videos',          details: 'Votes will be weighted when fewer than 5 are eligible' },
	wrong_period:     { name: '2a',                 type: 'ineligible', 	  trigger: 'Video too old or new',        details: 'Vote for last month\'s videos based on your own time zone' },
	edge_date:		  { name: '2a',					type: 'maybe ineligible', trigger: 'Video may be too old or new', details: 'Vote for last month\'s videos based on your own time zone' },
	too_short:        { name: '4a',                 type: 'ineligible', 	  trigger: '<30 second video',            details: 'Short length: Videos must be 30 seconds or longer not including intros/outros/credits/etc' },
	maybe_too_short:  { name: '4a',                 type: 'maybe ineligible', trigger: '<=45 second video',           details: 'Short length: Videos must be 30 seconds or longer not including intros/outros/credits/etc' },
	no_simping:       { name: '5a',                 type: 'ineligible', 	  trigger: '>2 votes of same creator',	  details: 'You can include up to two videos from a given channel/creator, but no more.' },
	unsupported_site: { name: '1c',                 type: 'ineligible', 	  trigger: 'Unsupported platform link',   details: 'Currently allowed platforms: Bilibili, Bluesky, Dailymotion, Newgrounds, Odysee, Pony.Tube, ThisHorsie.Rocks, Tiktok, Twitter/X, Vimeo, and YouTube. This list is likely to change over time' },
	littleshy_vid:    { name: '5d',                 type: 'ineligible', 	  trigger: 'Littleshy video',             details: 'Don\'t vote for videos from the current host\'s channel, LittleshyFiM' }
}
