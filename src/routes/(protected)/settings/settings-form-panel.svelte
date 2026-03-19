<script lang="ts">
    import type { ActionData, PageData } from "./$types";
    import { invalidateAll } from "$app/navigation";
    import { BasicForm } from "@sjsf/form";
    import { createMeta, setupSvelteKitForm } from "@sjsf/sveltekit/client";
    import * as defaults from "$lib/components/settings/form-defaults";
    import { setShadcnContext } from "$lib/components/shadcn-context";
    import { toast } from "svelte-sonner";
    import { icons } from "@sjsf/lucide-icons";

    setShadcnContext();

    let { data }: { data: PageData } = $props();

    const meta = createMeta<ActionData, PageData>().form;
    const { form } = setupSvelteKitForm(meta, {
        ...defaults,
        icons,
        delayedMs: 500,
        timeoutMs: 30000,
        reset: false,
        invalidateAll: false,
        onSuccess: async (result) => {
            if (result.type === "success") {
                toast.success(`${data.currentTab.label} settings saved`);
                await invalidateAll();
            } else {
                toast.error("Failed to save settings");
            }
        },
        onFailure: () => {
            toast.error("Something went wrong while saving settings");
        }
    });
</script>

<BasicForm {form} method="POST"></BasicForm>
