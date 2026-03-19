import type { Actions, PageServerLoad } from "./$types";
import type { Schema } from "@sjsf/form";
import { error, fail } from "@sveltejs/kit";
import type { InitialFormData } from "@sjsf/sveltekit";
import { createFormHandler } from "@sjsf/sveltekit/server";
import * as defaults from "$lib/components/settings/form-defaults";
import providers from "$lib/providers";

type SettingsTabKey =
    | "general"
    | "library"
    | "media-server"
    | "content"
    | "downloaders"
    | "queue"
    | "scrapers"
    | "ranking"
    | "advanced";

type SettingsTab = {
    key: SettingsTabKey;
    label: string;
    title: string;
    keys: string[];
};

type SettingsFormData = Record<string, unknown>;

const SETTINGS_TABS: SettingsTab[] = [
    {
        key: "general",
        label: "General",
        title: "General Settings",
        keys: [
            "api_key",
            "log_level",
            "enable_network_tracing",
            "enable_stream_tracing",
            "retry_interval",
            "tracemalloc",
            "logging",
            "notifications",
            "stream"
        ]
    },
    {
        key: "library",
        label: "Library",
        title: "Library & Filesystem",
        keys: ["filesystem", "indexer", "post_processing"]
    },
    {
        key: "media-server",
        label: "Media Server",
        title: "Media Server",
        keys: ["updaters"]
    },
    {
        key: "content",
        label: "Content",
        title: "Content Sources",
        keys: ["content"]
    },
    {
        key: "downloaders",
        label: "Downloaders",
        title: "Downloader Providers",
        keys: [
            "downloaders.video_extensions",
            "downloaders.movie_filesize_mb_min",
            "downloaders.movie_filesize_mb_max",
            "downloaders.episode_filesize_mb_min",
            "downloaders.episode_filesize_mb_max",
            "downloaders.proxy_url",
            "downloaders.real_debrid",
            "downloaders.debrid_link",
            "downloaders.all_debrid"
        ]
    },
    {
        key: "queue",
        label: "Queue",
        title: "Queue & Orchestration",
        keys: ["downloaders.orchestrator"]
    },
    {
        key: "scrapers",
        label: "Scrapers",
        title: "Scrapers",
        keys: ["scraping"]
    },
    {
        key: "ranking",
        label: "Ranking",
        title: "Ranking",
        keys: ["ranking"]
    },
    {
        key: "advanced",
        label: "Advanced",
        title: "Advanced",
        keys: ["database"]
    }
];

const DEFAULT_TAB = SETTINGS_TABS[0];

const getSettingsTab = (tab: string | null): SettingsTab =>
    SETTINGS_TABS.find(({ key }) => key === tab) ?? DEFAULT_TAB;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, unknown> =>
    isRecord(value) ? Object.fromEntries(Object.entries(value)) : {};

const toSchema = (value: unknown): Schema => {
    if (isRecord(value)) {
        return value as Schema;
    }

    throw new Error("Invalid settings schema response");
};

const getValueAtPath = (source: Record<string, unknown>, path: string) =>
    path.split(".").reduce<unknown>((current, part) => {
        if (!current || typeof current !== "object" || !(part in current)) {
            return undefined;
        }

        return (current as Record<string, unknown>)[part];
    }, source);

const setValueAtPath = (
    target: Record<string, unknown>,
    path: string,
    value: unknown
): Record<string, unknown> => {
    const parts = path.split(".");
    let current = target;

    for (const part of parts.slice(0, -1)) {
        if (!current[part] || typeof current[part] !== "object") {
            current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
    return target;
};

const pickKeys = (source: Record<string, unknown>, keys: string[]) =>
    keys.reduce<Record<string, unknown>>((acc, key) => {
        const value = getValueAtPath(source, key);
        if (value !== undefined) {
            setValueAtPath(acc, key, value);
        }
        return acc;
    }, {});

const getSchemaForTab = async (
    baseUrl: string,
    apiKey: string,
    tab: SettingsTab,
    fetch: typeof globalThis.fetch
) => {
    const schema = await providers.riven.GET("/api/v1/settings/schema/keys", {
        baseUrl,
        headers: {
            "x-api-key": apiKey
        },
        params: {
            query: {
                keys: tab.keys.join(","),
                title: tab.title
            }
        },
        fetch
    });

    if (schema.error) {
        throw new Error(`Failed to load settings schema for tab ${tab.key}`);
    }

    return toSchema(schema.data);
};

export const load: PageServerLoad = async ({ fetch, locals, url }) => {
    const activeTab = getSettingsTab(url.searchParams.get("tab"));
    const allSettings = await providers.riven.GET("/api/v1/settings/get/all", {
        baseUrl: locals.backendUrl,
        headers: {
            "x-api-key": locals.apiKey
        },
        fetch: fetch
    });

    if (allSettings.error) {
        throw error(500, "Failed to load settings");
    }

    const schema = await getSchemaForTab(locals.backendUrl, locals.apiKey, activeTab, fetch);
    const initialSettings = toRecord(allSettings.data);
    const initialValue = pickKeys(initialSettings, activeTab.keys);

    return {
        activeTab: activeTab.key,
        currentTab: {
            key: activeTab.key,
            label: activeTab.label,
            title: activeTab.title
        },
        formKey: `${activeTab.key}:${JSON.stringify(initialValue)}`,
        tabs: SETTINGS_TABS.map(({ key, label, title }) => ({
            key,
            label,
            title,
            href: `/settings?tab=${key}`
        })),
        form: {
            schema,
            initialValue
        } satisfies InitialFormData
    };
};

export const actions = {
    default: async ({ request, fetch, locals, url }) => {
        const activeTab = getSettingsTab(url.searchParams.get("tab"));
        const schema = await getSchemaForTab(locals.backendUrl, locals.apiKey, activeTab, fetch);
        const handleForm = createFormHandler<SettingsFormData, true>({
            ...defaults,
            schema,
            sendData: true
        });

        const [form] = await handleForm(request.signal, await request.formData());
        if (!form.isValid) {
            return fail(400, { form });
        }

        // const res = await setAllSettings({
        //     fetch: fetch,
        //     body: form.data
        // });
        const res = await providers.riven.POST("/api/v1/settings/set/all", {
            body: form.data,
            baseUrl: locals.backendUrl,
            headers: {
                "x-api-key": locals.apiKey
            },
            fetch: fetch
        });

        if (res.error) {
            return fail(500, { form });
        }

        return { form };
    }
} satisfies Actions;
