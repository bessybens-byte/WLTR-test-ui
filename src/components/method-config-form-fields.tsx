"use client";

import { FieldLabel, Input, LabelWithHelp, Select } from "@/components/ui";
import { METHOD_CONFIG_FIELD_DISPLAY, METHOD_CONFIG_FIELD_HELP } from "@/lib/method-config-field-help";
import { LABEL_MODE_LABEL, LabelMode, QUANTITATION_MODE_LABEL, QuantitationMode } from "@/lib/types/wltr";

export type MethodConfigFormState = {
  name: string;
  /** API string enum: "RSquared" (display R²) | "R" (display √R² / correlation r) */
  labelMode: string;
  /** API string enum: "InternalStandard" | "ExternalStandard" */
  quantitationMode: string;
  minCorrelation: number;
  maxRSE: number;
  pctDiffLowBound: number;
  pctDiffHighBound: number;
  minPointsRequired: number;
  maxMissedPoints: number;
  icvLimitPercent: number;
  rsdPercentLimit: number;
  isRsdPercentLimit: number;
  icvCdsParityPercent: number;
  soilDilutionFactor: string;
  aqueousDilutionFactor: string;
  internalStandardResponseMin: string;
  internalStandardResponseMax: string;
};

export function MethodConfigFormFields({
  form,
  setForm,
  disabled = false,
  nameRequired = false,
}: {
  readonly form: MethodConfigFormState;
  readonly setForm: (next: MethodConfigFormState) => void;
  readonly disabled?: boolean;
  readonly nameRequired?: boolean;
}) {
  const h = METHOD_CONFIG_FIELD_HELP;
  const d = METHOD_CONFIG_FIELD_DISPLAY;

  return (
    <>
      <div>
        <LabelWithHelp htmlFor="name" help={h.name}>
          <FieldLabel {...d.name} />
        </LabelWithHelp>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={disabled}
          required={nameRequired}
        />
      </div>

      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <div className="mb-3 text-sm font-medium">Methodology</div>
        <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
          Regression type and weighting are chosen per calibration group on the report card. This section sets how curves
          are built (Y axis) and how pass/fail is labeled.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <LabelWithHelp htmlFor="lm" help={h.labelMode}>
              <FieldLabel {...d.labelMode} />
            </LabelWithHelp>
            <Select
              id="lm"
              value={form.labelMode}
              onChange={(e) => setForm({ ...form, labelMode: e.target.value })}
              disabled={disabled}
            >
              {Object.values(LabelMode).map((v) => (
                <option key={v} value={v}>
                  {LABEL_MODE_LABEL[v]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <LabelWithHelp htmlFor="qm" help={h.quantitationMode}>
              <FieldLabel {...d.quantitationMode} />
            </LabelWithHelp>
            <Select
              id="qm"
              value={form.quantitationMode}
              onChange={(e) => setForm({ ...form, quantitationMode: e.target.value })}
              disabled={disabled}
            >
              {Object.values(QuantitationMode).map((v) => (
                <option key={v} value={v}>
                  {QUANTITATION_MODE_LABEL[v]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <LabelWithHelp htmlFor="minCorrelation" help={h.minCorrelation}>
            <FieldLabel {...d.minCorrelation} />
          </LabelWithHelp>
          <Input
            id="minCorrelation"
            type="number"
            step="0.0001"
            value={form.minCorrelation}
            onChange={(e) => setForm({ ...form, minCorrelation: Number(e.target.value) })}
            disabled={disabled}
            placeholder="e.g. 0.995"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="maxRSE" help={h.maxRSE}>
            <FieldLabel {...d.maxRSE} />
          </LabelWithHelp>
          <Input
            id="maxRSE"
            type="number"
            step="0.0001"
            value={form.maxRSE}
            onChange={(e) => setForm({ ...form, maxRSE: Number(e.target.value) })}
            disabled={disabled}
            placeholder="> 0 (e.g. 25)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="pctDiffLowBound" help={h.pctDiffLowBound}>
            <FieldLabel {...d.pctDiffLowBound} />
          </LabelWithHelp>
          <Input
            id="pctDiffLowBound"
            type="number"
            step="0.0001"
            value={form.pctDiffLowBound}
            onChange={(e) => setForm({ ...form, pctDiffLowBound: Number(e.target.value) })}
            disabled={disabled}
            placeholder="< high bound (e.g. −20)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="pctDiffHighBound" help={h.pctDiffHighBound}>
            <FieldLabel {...d.pctDiffHighBound} />
          </LabelWithHelp>
          <Input
            id="pctDiffHighBound"
            type="number"
            step="0.0001"
            value={form.pctDiffHighBound}
            onChange={(e) => setForm({ ...form, pctDiffHighBound: Number(e.target.value) })}
            disabled={disabled}
            placeholder="> low bound (e.g. 20)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="minPointsRequired" help={h.minPointsRequired}>
            <FieldLabel {...d.minPointsRequired} />
          </LabelWithHelp>
          <Input
            id="minPointsRequired"
            type="number"
            value={form.minPointsRequired}
            onChange={(e) => setForm({ ...form, minPointsRequired: Number(e.target.value) })}
            disabled={disabled}
            placeholder="≥ 2"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="maxMissedPoints" help={h.maxMissedPoints}>
            <FieldLabel {...d.maxMissedPoints} />
          </LabelWithHelp>
          <Input
            id="maxMissedPoints"
            type="number"
            value={form.maxMissedPoints}
            onChange={(e) => setForm({ ...form, maxMissedPoints: Number(e.target.value) })}
            disabled={disabled}
            placeholder="e.g. 1"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="icvLimitPercent" help={h.icvLimitPercent}>
            <FieldLabel {...d.icvLimitPercent} />
          </LabelWithHelp>
          <Input
            id="icvLimitPercent"
            type="number"
            step="0.0001"
            value={form.icvLimitPercent}
            onChange={(e) => setForm({ ...form, icvLimitPercent: Number(e.target.value) })}
            disabled={disabled}
            placeholder="> 0 (e.g. 20)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="rsdPercentLimit" help={h.rsdPercentLimit}>
            <FieldLabel {...d.rsdPercentLimit} />
          </LabelWithHelp>
          <Input
            id="rsdPercentLimit"
            type="number"
            step="0.0001"
            value={form.rsdPercentLimit}
            onChange={(e) => setForm({ ...form, rsdPercentLimit: Number(e.target.value) })}
            disabled={disabled}
            placeholder="> 0 (e.g. 20)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="isRsdPercentLimit" help={h.isRsdPercentLimit}>
            <FieldLabel {...d.isRsdPercentLimit} />
          </LabelWithHelp>
          <Input
            id="isRsdPercentLimit"
            type="number"
            step="0.0001"
            value={form.isRsdPercentLimit}
            onChange={(e) => setForm({ ...form, isRsdPercentLimit: Number(e.target.value) })}
            disabled={disabled}
            placeholder="> 0 (e.g. 20)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="icvCdsParityPercent" help={h.icvCdsParityPercent}>
            <FieldLabel {...d.icvCdsParityPercent} />
          </LabelWithHelp>
          <Input
            id="icvCdsParityPercent"
            type="number"
            step="0.0001"
            value={form.icvCdsParityPercent}
            onChange={(e) => setForm({ ...form, icvCdsParityPercent: Number(e.target.value) })}
            disabled={disabled}
            placeholder="> 0 (e.g. 10)"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="soilDilutionFactor" help={h.soilDilutionFactor}>
            <FieldLabel {...d.soilDilutionFactor} />
          </LabelWithHelp>
          <Input
            id="soilDilutionFactor"
            type="number"
            step="any"
            value={form.soilDilutionFactor}
            onChange={(e) => setForm({ ...form, soilDilutionFactor: e.target.value })}
            disabled={disabled}
            placeholder="Optional"
          />
        </div>
        <div>
          <LabelWithHelp htmlFor="aqueousDilutionFactor" help={h.aqueousDilutionFactor}>
            <FieldLabel {...d.aqueousDilutionFactor} />
          </LabelWithHelp>
          <Input
            id="aqueousDilutionFactor"
            type="number"
            step="any"
            value={form.aqueousDilutionFactor}
            onChange={(e) => setForm({ ...form, aqueousDilutionFactor: e.target.value })}
            disabled={disabled}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Internal standard response bounds <span className="font-normal text-neutral-500 dark:text-neutral-400">(IS, optional)</span>
        </div>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Warn when mean internal-standard response drifts outside these inclusive bounds. Leave blank to disable.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <LabelWithHelp htmlFor="isMin" help={h.internalStandardResponseMin}>
              <FieldLabel {...d.internalStandardResponseMin} />
            </LabelWithHelp>
            <Input
              id="isMin"
              type="number"
              step="any"
              value={form.internalStandardResponseMin}
              onChange={(e) => setForm({ ...form, internalStandardResponseMin: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div>
            <LabelWithHelp htmlFor="isMax" help={h.internalStandardResponseMax}>
              <FieldLabel {...d.internalStandardResponseMax} />
            </LabelWithHelp>
            <Input
              id="isMax"
              type="number"
              step="any"
              value={form.internalStandardResponseMax}
              onChange={(e) => setForm({ ...form, internalStandardResponseMax: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </>
  );
}
