// A file containing the mappings for each of the labels to apply to videos upon validation when 
import { Flag } from "./types"

export type flagTypes = "disabled" | "eligible" | "maybe ineligible" | "ineligible"

export const stampMap: Record<flagTypes, { severity: number, icon: string }> = {
	ineligible: 		{ severity: 2, icon: "x.svg" 	     },
	eligible: 			{ severity: 0, icon: "checkmark.svg" },
	disabled: 			{ severity: 0, icon: "disabled.svg"  },
	"maybe ineligible": { severity: 1, icon: "warn.svg"  	 },
}


/**
 * Get the eligibility level and icon name for a given label and
 * passing condition used when rendering related components
 * @param label The label to apply when the condition fails
 * @param passing The condition in which the label would be applied when failed
 */
export function labelStamp(label: Flag, passing: boolean) {
	if (label.type === "disabled" || passing)
		return { ...stampMap.eligible, label }

	return { ...stampMap[label.type], label }
}


export type label_key =
	"invalid_link" |
	"duplicate_votes" |
	"missing_id" |
	"unavailable" |
	"sub_5_votes" |
	"wrong_period" |
	"edge_date" |
	"too_short" |
	"maybe_too_short" |
	"diversity_rule" |
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
	sub_5_votes:      { name: '1a',                 type: 'maybe ineligible', trigger: '<5 eligible videos',          details: 'Votes will be weighted when fewer than 5 are eligible' },
	wrong_period:     { name: '2a',                 type: 'ineligible', 	  trigger: 'Video too old or new',        details: 'Vote for last month\'s videos based on your own time zone' },
	edge_date:		  { name: '2a',					type: 'maybe ineligible', trigger: 'Video may be too old or new', details: 'Vote for last month\'s videos based on your own time zone' },
	too_short:        { name: '4a',                 type: 'ineligible', 	  trigger: '<30 second video',            details: 'Short length: Videos must be 30 seconds or longer not including intros/outros/credits/etc' },
	maybe_too_short:  { name: '4a',                 type: 'maybe ineligible', trigger: '<=45 second video',           details: 'Short length: Videos must be 30 seconds or longer not including intros/outros/credits/etc' },
	diversity_rule:   { name: '5a',                 type: 'ineligible', 	  trigger: '<5 creators from eligible',	  details: 'You must have at least five eligible votes from five different creators' },
	no_simping:       { name: '5b',                 type: 'maybe ineligible', trigger: '>2/creator or 2 & <5 unique', details: 'You can include up to two videos from a creator if the videos are unique and you\'re including votes for at least five creators total. Don\'t vote for multiple parts in a series or very similar videos from the same creator' },
	unsupported_site: { name: '1c',                 type: 'ineligible', 	  trigger: 'Unsupported platform link',   details: 'Currently allowed platforms: Bilibili, Bluesky, Dailymotion, Newgrounds, Odysee, Pony.Tube, ThisHorsie.Rocks, Tiktok, Twitter/X, Vimeo, and YouTube. This list is likely to change over time' },
	littleshy_vid:    { name: '5d',                 type: 'ineligible', 	  trigger: 'Littleshy video',             details: 'Don\'t vote for videos from the current host\'s channel, LittleshyFiM' }
}


export type client_labels = Record<
	"invalid_link" | "duplicate_votes" | "no_simping" | "unsupported_site" | "diversity_rule" | "sub_5_votes",
	Flag
>
