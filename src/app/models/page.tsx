"use client";

import { useEffect, useMemo, useState } from "react";
import { useModelsStore } from "../stores/modelsStore";
import type { Model } from "~/lib/types/model";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../_components/ui/sheet";
import { Input } from "../_components/ui/input";
import { Separator } from "../_components/ui/separator";
import { Badge } from "../_components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../_components/ui/card";
import { Heart } from "iconsax-react";
import CustomLoader from "../_components/customLoader";
import { api } from "~/trpc/react";
import { ScrollArea } from "../_components/ui/scroll-area";

export default function ModelsPage() {
  const { allModels, setAllModels, preferredModels, setPreferredModels } = useModelsStore();

  const [searchQuery, setSearchQuery] = useState("");

  const [openModel, setOpenModel] = useState<Model | null>(null);

  const [isOpen, setIsOpen] = useState(false);

  const { data: models } = api.models.getModels.useQuery(undefined, {
    enabled: allModels.length === 0,
  });

  const { mutate: savePreferredModelsMutation } = api.prefs.setPreferredModels.useMutation();

  useEffect(() => {
    if (models) {
      setAllModels(models);
    }
  }, [models]);

  const filteredModels = useMemo(
    () => allModels.filter((model) => model.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [allModels, searchQuery],
  );

  const sortedModels = useMemo(() => {
    return filteredModels.sort((a, b) => {
      const aIsPreferred = preferredModels.some((model) => model.id === a.id);
      const bIsPreferred = preferredModels.some((model) => model.id === b.id);

      if (aIsPreferred && !bIsPreferred) return -1;
      if (!aIsPreferred && bIsPreferred) return 1;

      return 0;
    });
  }, [filteredModels]);

  const togglePreferred = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();

    if (preferredModels.some((m) => m.id === modelId)) {
      const updatedModels = preferredModels.filter((m) => m.id !== modelId);

      setPreferredModels(updatedModels);
      savePreferredModelsMutation({ models: updatedModels });
    } else {
      const updatedModels = [...preferredModels, ...allModels.filter((m) => m.id === modelId)];

      setPreferredModels(updatedModels);
      savePreferredModelsMutation({ models: updatedModels });
    }
  };

  return allModels.length > 0 ? (
    <ScrollArea className="w-full h-full">
      <div className="max-w-9/12 mx-auto py-20">
        <Input
          className="mb-4 h-11"
          type="search"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedModels.map((model) => (
            <Card
              key={model.id}
              className="cursor-pointer relative"
              onClick={() => {
                setOpenModel(model);
                setIsOpen(true);
              }}
            >
              <CardHeader>
                <CardTitle className="font-medium text-base">{model.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{model.description}</p>
              </CardContent>
              <CardFooter className="flex flex-row justify-between items-center mt-auto">
                <Badge variant="outline">{model.architecture.modality}</Badge>
                <Heart
                  size={20}
                  className={`${preferredModels.some((m) => m.id === model.id) ? "fill-foreground/80 dark:fill-foreground stroke-foreground/80 dark:stroke-foreground" : "stroke-muted-foreground"}`}
                  onClick={(e) => togglePreferred(e, model.id)}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Sheet open={isOpen && openModel !== null} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto pb-12">
          {openModel && (
            <>
              <SheetHeader>
                <SheetTitle>{openModel.name}</SheetTitle>
                <SheetDescription>{openModel.description}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 px-6 pb-4">
                <h4 className="text-sm font-medium">Architecture</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-muted-foreground">Modality</div>
                  <div>{openModel.architecture.modality}</div>

                  <div className="text-muted-foreground">Input</div>
                  <div>{openModel.architecture.input_modalities.join(", ")}</div>

                  <div className="text-muted-foreground">Output</div>
                  <div>{openModel.architecture.output_modalities.join(", ")}</div>

                  <div className="text-muted-foreground">Tokenizer</div>
                  <div>{openModel.architecture.tokenizer}</div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4 p-6">
                <h4 className="text-sm font-medium">Supported Features</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-muted-foreground">Tool Usage</div>
                  <div>{openModel.supported_parameters.includes("tools") ? "Yes" : "No"}</div>

                  <div className="text-muted-foreground">Reasoning</div>
                  <div>{openModel.supported_parameters.includes("reasoning") ? "Yes" : "No"}</div>

                  <div className="text-muted-foreground">Web Search</div>
                  <div>{openModel.supported_parameters.includes("web_search_options") ? "Yes" : "No"}</div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4 p-6">
                <h4 className="text-sm font-medium">Pricing</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-muted-foreground">Prompt</div>
                  <div>${openModel.pricing.prompt}</div>

                  <div className="text-muted-foreground">Completion</div>
                  <div>${openModel.pricing.completion}</div>

                  <div className="text-muted-foreground">Request</div>
                  <div>${openModel.pricing.request}</div>

                  {openModel.pricing.image && (
                    <>
                      <div className="text-muted-foreground">Image</div>
                      <div>${openModel.pricing.image}</div>
                    </>
                  )}

                  {openModel.pricing.web_search && (
                    <>
                      <div className="text-muted-foreground">Web Search</div>
                      <div>${openModel.pricing.web_search}</div>
                    </>
                  )}

                  {openModel.pricing.internal_reasoning && (
                    <>
                      <div className="text-muted-foreground">Internal Reasoning</div>
                      <div>${openModel.pricing.internal_reasoning}</div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ScrollArea>
  ) : (
    <CustomLoader />
  );
}
