"use server"

import { unstable_cache } from "next/cache"
import { labels, client_labels, label_key } from "./labels"
import { getLabelConfigs } from "./queries/etc"
import { Flag } from "./types"


/**
 * Get labels that are updated alongside the stored label configurations in the database
 */
export const getLabels = unstable_cache(
	(async () =>
        Object.fromEntries(
            (await getLabelConfigs())
            .map(label => [
                Object.entries(labels).find(e => e[1].trigger === label.trigger)![0],
                label
            ])
        ) as Record<label_key, Flag>
    ),
	["labels"],
	{ tags: ["labels"] }
)


/**
 * Getter for a smaller label set to send to the client when
 * server side rendering components. This should never be imported
 * in client side components since the client bundled labels
 * object would only have its default values
 * @returns labels required for client side checks
 */
export async function getCliLabels(): Promise<client_labels> {
	const syncedLabels = await getLabels()

	return {
		invalid_link: syncedLabels.invalid_link,
		duplicate_votes: syncedLabels.duplicate_votes,
		no_simping: syncedLabels.no_simping,
		unsupported_site: syncedLabels.unsupported_site,
		diversity_rule: syncedLabels.diversity_rule,
		sub_5_votes: syncedLabels.sub_5_votes
	}
}
