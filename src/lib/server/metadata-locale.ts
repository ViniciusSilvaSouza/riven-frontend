import providers from "$lib/providers";

type MetadataSettings = {
    metadata?: {
        language?: string;
        region?: string;
        fallback_to_english?: boolean;
    };
};

export type MetadataLocale = {
    tmdbLanguage: string;
    tmdbRegion: string;
    tvdbLanguage: string;
    fallbackToEnglish: boolean;
};

const DEFAULT_METADATA_LOCALE: MetadataLocale = {
    tmdbLanguage: "en-US",
    tmdbRegion: "US",
    tvdbLanguage: "eng",
    fallbackToEnglish: true
};

const TVDB_LANGUAGE_MAP: Record<string, string> = {
    ar: "ara",
    de: "deu",
    en: "eng",
    es: "spa",
    fr: "fra",
    it: "ita",
    ja: "jpn",
    ko: "kor",
    nl: "nld",
    pl: "pol",
    pt: "por",
    ru: "rus",
    sv: "swe",
    tr: "tur",
    zh: "zho"
};

const normalizeTmdbLanguage = (language?: string) => {
    const raw = String(language ?? "")
        .trim()
        .replaceAll("_", "-");

    if (!raw) {
        return DEFAULT_METADATA_LOCALE.tmdbLanguage;
    }

    const [baseLanguage = "en", region] = raw.split("-");

    if (!region) {
        return baseLanguage.toLowerCase();
    }

    return `${baseLanguage.toLowerCase()}-${region.toUpperCase()}`;
};

const normalizeRegion = (region?: string) => {
    const raw = String(region ?? "").trim();
    return raw ? raw.toUpperCase() : DEFAULT_METADATA_LOCALE.tmdbRegion;
};

const toTvdbLanguage = (language?: string) => {
    const normalizedLanguage = normalizeTmdbLanguage(language);
    const baseLanguage = normalizedLanguage.split("-")[0];

    if (baseLanguage.length === 3) {
        return baseLanguage;
    }

    return TVDB_LANGUAGE_MAP[baseLanguage] ?? DEFAULT_METADATA_LOCALE.tvdbLanguage;
};

const toMetadataLocale = (settings: MetadataSettings | null | undefined): MetadataLocale => {
    const metadata = settings?.metadata;
    const tmdbLanguage = normalizeTmdbLanguage(metadata?.language);

    return {
        tmdbLanguage,
        tmdbRegion: normalizeRegion(metadata?.region),
        tvdbLanguage: toTvdbLanguage(tmdbLanguage),
        fallbackToEnglish: metadata?.fallback_to_english ?? true
    };
};

export async function getMetadataLocale({
    apiKey,
    baseUrl,
    fetch
}: {
    apiKey: string;
    baseUrl: string;
    fetch: typeof globalThis.fetch;
}): Promise<MetadataLocale> {
    const response = await providers.riven.GET("/api/v1/settings/get/all", {
        baseUrl,
        headers: {
            "x-api-key": apiKey
        },
        fetch
    });

    return response.error
        ? DEFAULT_METADATA_LOCALE
        : toMetadataLocale(response.data as MetadataSettings);
}
