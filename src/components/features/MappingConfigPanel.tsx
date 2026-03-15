import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { X, Plus, GripVertical, ChevronDown, ChevronUp, Info, RotateCcw, Check, Settings2 } from "lucide-react";

export interface MappingConfig {
  properties: string[];
  renewal: string[];
  expansion: string[];
  netNew: string[];
  pipelineProperties: string[];
  pipelines: {
    renewal: string[];
    bd: string[];
  };
  productProperties: string[];
  products: {
    "Nuro": string[];
    "Access Hub": string[];
    "Evidence Hub": string[];
  };
}

export const DEFAULT_MAPPING: MappingConfig = {
  properties: ["hs_deal_category", "deal_category", "dealtype", "pipeline"],
  renewal: ["renewal", "existing_renewal", "existingbusiness"],
  expansion: ["expansion"],
  netNew: ["net_new", "netnew", "newbusiness"],
  pipelineProperties: ["pipeline"],
  pipelines: {
    renewal: ["digital_-_renewal_pipeline", "renewal", "renewals"],
    bd: ["digital_-_bd_pipeline", "bd", "business_development", "business_development"],
  },
  productProperties: ["product", "product_line", "line_of_business", "business_unit"],
  products: {
    "Nuro": ["nuro"],
    "Access Hub": ["access_hub", "access hub"],
    "Evidence Hub": ["evidence_hub", "evidence hub"],
  },
};

const STORAGE_KEY = "nuro_hs_mapping_config";

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

function normalizeMappingConfig(raw: Partial<MappingConfig> | null | undefined): MappingConfig {
  const properties = normalizeTags(raw?.properties);
  const renewal = normalizeTags(raw?.renewal);
  const expansion = normalizeTags(raw?.expansion);
  const netNew = normalizeTags(raw?.netNew);
  const pipelineProperties = normalizeTags(raw?.pipelineProperties);
  const renewalPipelines = normalizeTags(raw?.pipelines?.renewal);
  const bdPipelines = normalizeTags(raw?.pipelines?.bd);
  const productProperties = normalizeTags(raw?.productProperties);
  const nuro = normalizeTags(raw?.products?.["Nuro"]);
  const accessHub = normalizeTags(raw?.products?.["Access Hub"]);
  const evidenceHub = normalizeTags(raw?.products?.["Evidence Hub"]);

  return {
    properties: properties.length ? properties : DEFAULT_MAPPING.properties,
    renewal: renewal.length ? renewal : DEFAULT_MAPPING.renewal,
    expansion: expansion.length ? expansion : DEFAULT_MAPPING.expansion,
    netNew: netNew.length ? netNew : DEFAULT_MAPPING.netNew,
    pipelineProperties: pipelineProperties.length ? pipelineProperties : DEFAULT_MAPPING.pipelineProperties,
    pipelines: {
      renewal: renewalPipelines.length ? renewalPipelines : DEFAULT_MAPPING.pipelines.renewal,
      bd: bdPipelines.length ? bdPipelines : DEFAULT_MAPPING.pipelines.bd,
    },
    productProperties: productProperties.length ? productProperties : DEFAULT_MAPPING.productProperties,
    products: {
      "Nuro": nuro.length ? nuro : DEFAULT_MAPPING.products["Nuro"],
      "Access Hub": accessHub.length ? accessHub : DEFAULT_MAPPING.products["Access Hub"],
      "Evidence Hub": evidenceHub.length ? evidenceHub : DEFAULT_MAPPING.products["Evidence Hub"],
    },
  };
}

export function loadMappingConfig(): MappingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeMappingConfig(JSON.parse(raw) as Partial<MappingConfig>);
  } catch {
    // Ignore malformed saved config and fall back to defaults.
  }
  return DEFAULT_MAPPING;
}

export function saveMappingConfig(cfg: MappingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeMappingConfig(cfg)));
}

interface TagInputProps {
  tags: string[];
  accent: string;
  dotColor: string;
  onChange: (tags: string[]) => void;
}

function TagInput({ tags, accent, dotColor, onChange }: TagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const trimmed = input.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 items-center min-h-[38px] bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 cursor-text focus-within:border-white/25 transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md ${accent}`}
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          {tag}
          <button
            onClick={(e) => { e.stopPropagation(); remove(tag); }}
            className="ml-0.5 hover:text-white/80 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        placeholder={tags.length === 0 ? "Type a value, press Enter..." : ""}
        className="bg-transparent text-xs text-white/60 placeholder-white/20 outline-none flex-1 min-w-[120px]"
      />
    </div>
  );
}

interface PropRowProps {
  value: string;
  index: number;
  total: number;
  onChange: (v: string) => void;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
}

function PropRow({ value, index, total, onChange, onMove, onRemove }: PropRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-white/20 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <span className="text-[10px] text-white/20 w-4 text-right font-mono">{index + 1}.</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().trim())}
        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-white/25 placeholder-white/15 transition-colors"
        placeholder="hubspot_property_name"
      />
      <button
        disabled={index === 0}
        onClick={() => onMove("up")}
        className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed text-white/40 transition-colors"
      >
        <ChevronUp className="w-3 h-3" />
      </button>
      <button
        disabled={index === total - 1}
        onClick={() => onMove("down")}
        className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed text-white/40 transition-colors"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/30 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface MappingConfigPanelProps {
  open: boolean;
  config: MappingConfig;
  onClose: () => void;
  onSave: (cfg: MappingConfig) => void;
}

const REVENUE_CATEGORIES = [
  {
    key: "renewal" as const,
    label: "ER - Existing Renewal",
    accent: "text-sky-400",
    dot: "bg-sky-400",
    description: "Deal property values that should be classified as Existing Renewal revenue.",
  },
  {
    key: "expansion" as const,
    label: "EN - Expansion",
    accent: "text-violet-400",
    dot: "bg-violet-400",
    description: "Deal property values that should be classified as Expansion revenue.",
  },
  {
    key: "netNew" as const,
    label: "NN - Net New",
    accent: "text-amber-400",
    dot: "bg-amber-400",
    description: "Deal property values that should be classified as Net New revenue.",
  },
];

const PRODUCT_CATEGORIES = [
  {
    key: "Nuro" as const,
    label: "Nuro",
    accent: "text-violet-400",
    dot: "bg-violet-400",
    description: "Deal property values that should be assigned to Nuro.",
  },
  {
    key: "Access Hub" as const,
    label: "Access Hub",
    accent: "text-cyan-400",
    dot: "bg-cyan-400",
    description: "Deal property values that should be assigned to Access Hub.",
  },
  {
    key: "Evidence Hub" as const,
    label: "Evidence Hub",
    accent: "text-indigo-400",
    dot: "bg-indigo-400",
    description: "Deal property values that should be assigned to Evidence Hub.",
  },
];

const PIPELINE_CATEGORIES = [
  {
    key: "renewal" as const,
    label: "Renewal Pipeline",
    accent: "text-sky-400",
    dot: "bg-sky-400",
    description: "Pipeline names or ids that should feed ER actuals.",
  },
  {
    key: "bd" as const,
    label: "BD Pipeline",
    accent: "text-violet-400",
    dot: "bg-violet-400",
    description: "Pipeline names or ids that should feed EN and NN actuals.",
  },
];

export default function MappingConfigPanel({ open, config, onClose, onSave }: MappingConfigPanelProps) {
  const [draft, setDraft] = useState<MappingConfig>(normalizeMappingConfig(config));
  const [saved, setSaved] = useState(false);
  const [newProp, setNewProp] = useState("");
  const [newPipelineProp, setNewPipelineProp] = useState("");
  const [newProductProp, setNewProductProp] = useState("");
  const isDefault = JSON.stringify(draft) === JSON.stringify(DEFAULT_MAPPING);

  useEffect(() => {
    setDraft(normalizeMappingConfig(config));
  }, [config]);

  function updateProp(i: number, v: string) {
    const props = [...draft.properties];
    props[i] = v;
    setDraft({ ...draft, properties: props });
  }

  function moveProp(i: number, dir: "up" | "down") {
    const props = [...draft.properties];
    const swap = dir === "up" ? i - 1 : i + 1;
    [props[i], props[swap]] = [props[swap], props[i]];
    setDraft({ ...draft, properties: props });
  }

  function removeProp(i: number) {
    setDraft({ ...draft, properties: draft.properties.filter((_, idx) => idx !== i) });
  }

  function addProp() {
    const value = newProp.trim().toLowerCase().replace(/\s+/g, "_");
    if (value && !draft.properties.includes(value)) {
      setDraft({ ...draft, properties: [...draft.properties, value] });
    }
    setNewProp("");
  }

  function updatePipelineProp(i: number, v: string) {
    const props = [...draft.pipelineProperties];
    props[i] = v;
    setDraft({ ...draft, pipelineProperties: props });
  }

  function movePipelineProp(i: number, dir: "up" | "down") {
    const props = [...draft.pipelineProperties];
    const swap = dir === "up" ? i - 1 : i + 1;
    [props[i], props[swap]] = [props[swap], props[i]];
    setDraft({ ...draft, pipelineProperties: props });
  }

  function removePipelineProp(i: number) {
    setDraft({ ...draft, pipelineProperties: draft.pipelineProperties.filter((_, idx) => idx !== i) });
  }

  function addPipelineProp() {
    const value = newPipelineProp.trim().toLowerCase().replace(/\s+/g, "_");
    if (value && !draft.pipelineProperties.includes(value)) {
      setDraft({ ...draft, pipelineProperties: [...draft.pipelineProperties, value] });
    }
    setNewPipelineProp("");
  }

  function updateProductProp(i: number, v: string) {
    const props = [...draft.productProperties];
    props[i] = v;
    setDraft({ ...draft, productProperties: props });
  }

  function moveProductProp(i: number, dir: "up" | "down") {
    const props = [...draft.productProperties];
    const swap = dir === "up" ? i - 1 : i + 1;
    [props[i], props[swap]] = [props[swap], props[i]];
    setDraft({ ...draft, productProperties: props });
  }

  function removeProductProp(i: number) {
    setDraft({ ...draft, productProperties: draft.productProperties.filter((_, idx) => idx !== i) });
  }

  function addProductProp() {
    const value = newProductProp.trim().toLowerCase().replace(/\s+/g, "_");
    if (value && !draft.productProperties.includes(value)) {
      setDraft({ ...draft, productProperties: [...draft.productProperties, value] });
    }
    setNewProductProp("");
  }

  function handleSave() {
    onSave(normalizeMappingConfig(draft));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setDraft(DEFAULT_MAPPING);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full z-50 w-full max-w-[520px] flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(160deg, #141d35 0%, #0f1629 100%)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}
            >
              <Settings2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">HubSpot Mapping</h2>
              <p className="text-[11px] text-white/35">Deal fields to product and revenue category rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div
            className="flex gap-3 rounded-xl p-3.5"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}
          >
            <Info className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/50 leading-relaxed">
              Configure which HubSpot deal properties are used to identify both revenue category and product. Properties are checked in priority order, and the next sync will use whatever is saved here.
            </p>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Revenue Property Priority</h3>
              <span className="text-[10px] text-white/30 ml-auto">Checked top to bottom</span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed -mt-1">
              Add the HubSpot properties that identify whether a deal is renewal, expansion, or net new.
            </p>

            <div className="space-y-2">
              {draft.properties.map((prop, index) => (
                <PropRow
                  key={index}
                  value={prop}
                  index={index}
                  total={draft.properties.length}
                  onChange={(value) => updateProp(index, value)}
                  onMove={(dir) => moveProp(index, dir)}
                  onRemove={() => removeProp(index)}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newProp}
                onChange={(e) => setNewProp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addProp(); }}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-amber-500/40 placeholder-white/15 transition-colors"
                placeholder="Add revenue property name..."
              />
              <button
                onClick={addProp}
                disabled={!newProp.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/50 hover:text-white/80 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Revenue Value Mapping</h3>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed -mt-2">
              Add the raw HubSpot values that should map to ER, EN, and NN.
            </p>

            {REVENUE_CATEGORIES.map(({ key, label, accent, dot, description }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className={`text-xs font-bold ${accent}`}>{label}</span>
                </div>
                <p className="text-[10px] text-white/30 pl-4 -mt-1">{description}</p>
                <TagInput
                  tags={draft[key]}
                  accent={accent}
                  dotColor={dot}
                  onChange={(tags) => setDraft({ ...draft, [key]: tags })}
                />
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pipeline Property Priority</h3>
              <span className="text-[10px] text-white/30 ml-auto">Checked top to bottom</span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed -mt-1">
              Add the HubSpot properties that identify which pipeline a deal belongs to. We use this to detect renewal and BD pipelines.
            </p>

            <div className="space-y-2">
              {draft.pipelineProperties.map((prop, index) => (
                <PropRow
                  key={`pipeline-${index}`}
                  value={prop}
                  index={index}
                  total={draft.pipelineProperties.length}
                  onChange={(value) => updatePipelineProp(index, value)}
                  onMove={(dir) => movePipelineProp(index, dir)}
                  onRemove={() => removePipelineProp(index)}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newPipelineProp}
                onChange={(e) => setNewPipelineProp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addPipelineProp(); }}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-sky-500/40 placeholder-white/15 transition-colors"
                placeholder="Add pipeline property name..."
              />
              <button
                onClick={addPipelineProp}
                disabled={!newPipelineProp.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/50 hover:text-white/80 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pipeline Mapping</h3>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed -mt-2">
              Enter the renewal and BD pipeline names or ids. The sync will resolve both labels and internal ids.
            </p>

            {PIPELINE_CATEGORIES.map(({ key, label, accent, dot, description }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className={`text-xs font-bold ${accent}`}>{label}</span>
                </div>
                <p className="text-[10px] text-white/30 pl-4 -mt-1">{description}</p>
                <TagInput
                  tags={draft.pipelines[key]}
                  accent={accent}
                  dotColor={dot}
                  onChange={(tags) => setDraft({ ...draft, pipelines: { ...draft.pipelines, [key]: tags } })}
                />
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Product Property Priority</h3>
              <span className="text-[10px] text-white/30 ml-auto">Checked top to bottom</span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed -mt-1">
              Add the HubSpot properties that identify which product line a deal belongs to.
            </p>

            <div className="space-y-2">
              {draft.productProperties.map((prop, index) => (
                <PropRow
                  key={`product-${index}`}
                  value={prop}
                  index={index}
                  total={draft.productProperties.length}
                  onChange={(value) => updateProductProp(index, value)}
                  onMove={(dir) => moveProductProp(index, dir)}
                  onRemove={() => removeProductProp(index)}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newProductProp}
                onChange={(e) => setNewProductProp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addProductProp(); }}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white/70 focus:outline-none focus:border-cyan-500/40 placeholder-white/15 transition-colors"
                placeholder="Add product property name..."
              />
              <button
                onClick={addProductProp}
                disabled={!newProductProp.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white/50 hover:text-white/80 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Product Value Mapping</h3>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed -mt-2">
              Add the raw HubSpot values that should map a deal into the right dashboard product.
            </p>

            {PRODUCT_CATEGORIES.map(({ key, label, accent, dot, description }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className={`text-xs font-bold ${accent}`}>{label}</span>
                </div>
                <p className="text-[10px] text-white/30 pl-4 -mt-1">{description}</p>
                <TagInput
                  tags={draft.products[key]}
                  accent={accent}
                  dotColor={dot}
                  onChange={(tags) => setDraft({ ...draft, products: { ...draft.products, [key]: tags } })}
                />
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Current Active Config</h3>
              {isDefault && <span className="text-[10px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded-full">Default</span>}
              {!isDefault && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Modified</span>}
            </div>
            <div
              className="rounded-xl p-3.5 font-mono text-[10px] text-white/40 leading-relaxed overflow-x-auto"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <pre>{JSON.stringify(draft, null, 2)}</pre>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between gap-3 shrink-0" style={{ background: "rgba(15,22,41,0.8)" }}>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                saved ? "bg-emerald-500 text-black" : "bg-amber-500 hover:bg-amber-400 text-black"
              }`}
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saved ? "Saved!" : "Save & Apply"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
