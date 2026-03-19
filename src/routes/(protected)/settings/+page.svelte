<script lang="ts">
    import type { PageData } from "./$types";
    import { resolve } from "$app/paths";
    import PageShell from "$lib/components/page-shell.svelte";
    import SettingsFormPanel from "./settings-form-panel.svelte";
    import { cn } from "$lib/utils.js";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>Settings - Riven</title>
</svelte:head>

<PageShell class="h-full">
    <div class="flex h-full min-h-0 flex-col gap-6">
        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
            <p class="text-muted-foreground text-sm">
                Split into focused sections so it is easier to configure and test the stack.
            </p>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-4">
            <div class="flex w-full flex-wrap gap-2">
                {#each data.tabs as tab (tab.key)}
                    <a
                        href={resolve(tab.href)}
                        data-sveltekit-reload
                        aria-current={tab.key === data.activeTab ? "page" : undefined}
                        class={cn(
                            "border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-11 min-w-[9rem] items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
                            tab.key === data.activeTab &&
                                "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground shadow-sm"
                        )}>
                        {tab.label}
                    </a>
                {/each}
            </div>

            <div class="space-y-1">
                <h2 class="text-lg font-semibold tracking-tight">{data.currentTab.title}</h2>
                <p class="text-muted-foreground text-sm">
                    Active section: {data.currentTab.label}
                </p>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto pr-1">
                {#key `${data.activeTab}:${data.currentTab.title}`}
                    <SettingsFormPanel {data} />
                {/key}
            </div>
        </div>
    </div>
</PageShell>
