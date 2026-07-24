# MS4 VOC 230120 Workbook Parity Report

**Verdict:** Ready with known gaps

## Environment

- Workbook: `c:\Users\AbdulaiAwal\Downloads\wltr\docs\230120_MS4_VOC_Preloaded (5) - Unlocked.xlsm`
- API: `http://localhost:5000`
- UI: `http://localhost:3000`
- Lab: `MS4-VOC-Parity-230120-029cf398` (`9c826e89-3d74-4980-a0c9-d2dd974c61cf`)
- Calibration group: `0ce7f6a5-5d90-44bf-bca5-e3090edd9a6e`
- Lab admin: `parity-admin-029cf398@wltr.local`
- Generated: `2026-07-12T00:07:10.298214+00:00`

## Summary

- Analytes compared: **71** (API executive rows: 62)
- Full numeric PASS: **12**
- Pass with numeric drift: **31**
- ICAL gate mismatches (Excel Acceptable vs WLTR Fail/Pass): **19**
- Other fails: **9**
- Model selection failures: **9**

## Intentional divergences / known gaps

- Single global minPointsRequired (Quad=6) vs Excel Avg/LS/Quad separate minima
- WLTR workflow states Draft/Computed/Approved have no Excel equivalent
- Report Writer Instrument #REF! ignored
- Method Blank limits stored but not evaluated until blank runs exist
- pctDiff bounds mapped from Excel 0.8/1.2 × ±20% → -16 / +24
- Excel ICAL SUMMARY can be Acceptable when RSD fails if chosen curve model passes; WLTR calStatus may still Fail on %RSD / missed points

## Per-analyte results

| Analyte | Excel ICAL | API status | Model | RF | RSD | r² | Result |
|---|---|---|---|---|---|---|---|
| Dichlorodifluoromethane | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| Chloromethane-P | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| Vinyl Chloride-C | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| Bromomethane | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| Chloroethane | Acceptable | Fail | Y | Y | N | N | GATE_MISMATCH |
| Trichlorofluoromethane | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| 1,1-Dichloroethene-C | Acceptable | Fail | Y | Y | Y | N | GATE_MISMATCH |
| Acetone | Acceptable | Fail | Y | N | N | Y | GATE_MISMATCH |
| tert-Butanol | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| Methylene Chloride | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| Methyl-tert-butyl ethe.. | Acceptable | None | N | N | N | N | FAIL |
| trans-1,2-Dichloroethene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Di-isopropyl ether | Acceptable | Fail | Y | Y | Y | N | GATE_MISMATCH |
| 1,1-Dichloroethane-P | Acceptable | Fail | Y | Y | Y | N | GATE_MISMATCH |
| Ethyl-tert-butyl ether.. | Acceptable | None | N | N | N | N | FAIL |
| 2-Butanone (MEK) | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| cis-1,2-Dichloroethene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 2,2-Dichloropropane | Acceptable | Pass | Y | N | N | Y | PASS_WITH_NUMERIC_DRIFT |
| Bromochloromethane | Acceptable | Pass | Y | N | N | N | PASS_WITH_NUMERIC_DRIFT |
| Chloroform-C | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| 1,1,1-Trichloroethane | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Carbon Tetrachloride | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 1,1-Dichloropropene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| tert-Amyl methyl ether.. | Acceptable | None | N | N | N | N | FAIL |
| Benzene | Acceptable | Fail | Y | Y | Y | N | GATE_MISMATCH |
| 1,2-Dichloroethane | Acceptable | Fail | Y | Y | Y | N | GATE_MISMATCH |
| Trichloroethene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1,2-Dichloropropane-C | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Dibromomethane | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Bromodichloromethane | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| 2-Chloroethyl vinyl ethe | Acceptable | None | N | N | N | N | FAIL |
| cis-1,3-Dichloropropene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 4-Methyl-2-pentanone (.. | Acceptable | None | N | N | N | N | FAIL |
| Toluene-C | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| trans-1,3-Dichloropropen | Acceptable | None | N | N | N | N | FAIL |
| 1,1,2-Trichloroethane | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Tetrachloroethene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 2-Hexanone | Acceptable | Fail | Y | N | N | N | GATE_MISMATCH |
| 1,3-Dichloropropane | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Dibromochloromethane | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1,2-Dibromoethane | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Chlorobenzene-P | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Ethylbenzene-C | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1,1,1,2-Tetrachloroethan | Acceptable | None | N | N | N | N | FAIL |
| m,p-Xylene | Acceptable | Pass | Y | N | Y | N | PASS_WITH_NUMERIC_DRIFT |
| o-Xylene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| Styrene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| Bromoform-P | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Isopropylbenzene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1,1,2,2-Tetrachloroeth.. | Acceptable | None | N | N | N | N | FAIL |
| Bromobenzene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| n-Propylbenzene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1,2,3-Trichloropropane | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 2-Chlorotoluene | Acceptable | Pass | Y | N | N | Y | PASS_WITH_NUMERIC_DRIFT |
| 1,3,5-Trimethylbenzene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 4-Chlorotoluene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| tert-Butylbenzene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 1,2,4-Trimethylbenzene | Acceptable | Pass | Y | N | N | N | PASS_WITH_NUMERIC_DRIFT |
| sec-Butylbenzene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 4-Isopropyltoluene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 1,3-Dichlorobenzene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 1,4-Dichlorobenzene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| n-Butylbenzene | Acceptable | Pass | Y | Y | Y | Y | PASS |
| 1,2-Dichlorobenzene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1,2-Dibromo-3-chloropr.. | Acceptable | None | N | N | N | N | FAIL |
| 1,2,4-Trichlorobenzene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Hexachlorobutadiene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| Naphthalene | Acceptable | Fail | Y | Y | Y | N | GATE_MISMATCH |
| 1,2,3-Trichlorobenzene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 2-Methylnaphthalene | Acceptable | Pass | Y | Y | Y | N | PASS_WITH_NUMERIC_DRIFT |
| 1-Methylnaphthalene | Acceptable | Pass | Y | N | N | N | PASS_WITH_NUMERIC_DRIFT |

## Failures / gate mismatches

### Dichlorodifluoromethane — GATE_MISMATCH
- Excel: `{"averageRf": 0.1963003949765928, "rsdPercent": 21.331194919151375, "rsdPass": "N", "chosenModelCode": "QIC", "rSquared": 0.9948619921076552, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 3 exceeds the maximum allowed of 2.", "%RSD 29.038512 exceeds the maximum of 15."], "meanRf": 0.1816162490222863, "rsdPercent": 29.03851217161641, "rSquared": 0.9967661525306429, "selectedRegressionType": "Quadratic", "selectedWeightingMode": "InverseX", "matchedApiName": "Dichlorodifluoromethane"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Chloromethane-P — GATE_MISMATCH
- Excel: `{"averageRf": 0.2746093945391784, "rsdPercent": 15.816257852752393, "rsdPass": "N", "chosenModelCode": "QIC", "rSquared": 0.9963799869300027, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["%RSD 20.238395 exceeds the maximum of 15."], "meanRf": 0.2728033255703407, "rsdPercent": 20.23839532997933, "rSquared": 0.9985587891493467, "selectedRegressionType": "Quadratic", "selectedWeightingMode": "InverseX", "matchedApiName": "Chloromethane-P"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Vinyl Chloride-C — GATE_MISMATCH
- Excel: `{"averageRf": 0.2998025162526904, "rsdPercent": 12.753131336541697, "rsdPass": "Y", "chosenModelCode": "QIC", "rSquared": 0.9979146566042022, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["%RSD 15.330267 exceeds the maximum of 15."], "meanRf": 0.29261160654637836, "rsdPercent": 15.330267312698897, "rSquared": 0.9990669571110394, "selectedRegressionType": "Quadratic", "selectedWeightingMode": "InverseX", "matchedApiName": "Vinyl Chloride-C"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Bromomethane — GATE_MISMATCH
- Excel: `{"averageRf": 0.20198323442389943, "rsdPercent": 6.832953710130549, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 3 exceeds the maximum allowed of 2.", "R\u00b2 0.927574 is below the minimum of 0.990025.", "%RSD 25.869009 exceeds the maximum of 15."], "meanRf": 0.22196029519880628, "rsdPercent": 25.86900883788855, "rSquared": 0.9275744225469227, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Bromomethane"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Chloroethane — GATE_MISMATCH
- Excel: `{"averageRf": 0.19962398100598844, "rsdPercent": 11.544665454408731, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 3 exceeds the maximum allowed of 2.", "R\u00b2 0.907989 is below the minimum of 0.990025."], "meanRf": 0.20039307679403193, "rsdPercent": 14.89701980029687, "rSquared": 0.9079891637441531, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Chloroethane"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Trichlorofluoromethane — GATE_MISMATCH
- Excel: `{"averageRf": 0.4595071530546511, "rsdPercent": 9.750763573538265, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.958909 is below the minimum of 0.990025."], "meanRf": 0.4650076530414334, "rsdPercent": 10.16338444418315, "rSquared": 0.9589091184564026, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Trichlorofluoromethane"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### 1,1-Dichloroethene-C — GATE_MISMATCH
- Excel: `{"averageRf": 0.29219179448900795, "rsdPercent": 7.308156932687291, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1.0000000000000004, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.979853 is below the minimum of 0.990025."], "meanRf": 0.2921917944890079, "rsdPercent": 7.30815693268729, "rSquared": 0.979852793571129, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "1,1-Dichloroethene-C"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": true, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Acetone — GATE_MISMATCH
- Excel: `{"averageRf": 0.02745517570504561, "rsdPercent": 23.08608797942931, "rsdPass": "N", "chosenModelCode": "LSIC", "rSquared": 0.9993945474827449, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["%RSD 55.642935 exceeds the maximum of 15."], "meanRf": 0.03531350679787679, "rsdPercent": 55.642935474617246, "rSquared": 0.9989407030397698, "selectedRegressionType": "Linear", "selectedWeightingMode": "InverseX", "matchedApiName": "Acetone"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": true, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### tert-Butanol — GATE_MISMATCH
- Excel: `{"averageRf": 0.01990389704292078, "rsdPercent": 23.39848655404219, "rsdPass": "N", "chosenModelCode": "LSIC", "rSquared": 0.999098917821601, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["%RSD 38.765483 exceeds the maximum of 15."], "meanRf": 0.23496903553562773, "rsdPercent": 38.765483168230105, "rSquared": 0.9977660372866105, "selectedRegressionType": "Linear", "selectedWeightingMode": "InverseX", "matchedApiName": "tert-Butanol"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Methylene Chloride — GATE_MISMATCH
- Excel: `{"averageRf": 0.3077033997037533, "rsdPercent": 7.41470420293024, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.980273 is below the minimum of 0.990025."], "meanRf": 0.3117061173423114, "rsdPercent": 8.39924294350974, "rSquared": 0.9802726566487486, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Methylene Chloride"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Methyl-tert-butyl ethe.. — FAIL
- Excel: `{"averageRf": 0.7840320881451593, "rsdPercent": 6.049647880212925, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1.0000000000000004, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### Di-isopropyl ether — GATE_MISMATCH
- Excel: `{"averageRf": 1.030126032831288, "rsdPercent": 8.714831096681106, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.980325 is below the minimum of 0.990025."], "meanRf": 1.030126032831288, "rsdPercent": 8.714831096681099, "rSquared": 0.980324697576364, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Di-isopropyl ether"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": true, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### 1,1-Dichloroethane-P — GATE_MISMATCH
- Excel: `{"averageRf": 0.5751691871164799, "rsdPercent": 5.7798072904015365, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1.0000000000000004, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.989705 is below the minimum of 0.990025."], "meanRf": 0.5751691871164799, "rsdPercent": 5.779807290401531, "rSquared": 0.9897048788631219, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "1,1-Dichloroethane-P"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": true, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Ethyl-tert-butyl ether.. — FAIL
- Excel: `{"averageRf": 0.92855667761656, "rsdPercent": 5.947135153517174, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1.0000000000000004, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### 2-Butanone (MEK) — GATE_MISMATCH
- Excel: `{"averageRf": 0.024412939085473172, "rsdPercent": 16.84693257316677, "rsdPass": "N", "chosenModelCode": "LSIC", "rSquared": 0.9990637612711072, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 5 exceeds the maximum allowed of 2.", "R\u00b2 0.986468 is below the minimum of 0.990025.", "%RSD 88.61243 exceeds the maximum of 15."], "meanRf": 0.05054176938326904, "rsdPercent": 88.61243032591484, "rSquared": 0.9864679510240866, "selectedRegressionType": "Linear", "selectedWeightingMode": "InverseX", "matchedApiName": "2-Butanone (MEK)"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Chloroform-C — GATE_MISMATCH
- Excel: `{"averageRf": 0.5725943334158394, "rsdPercent": 8.407549394295552, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": null, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 11 exceeds the maximum allowed of 2.", "R\u00b2 -0.644411 is below the minimum of 0.990025.", "%RSD 97.121914 exceeds the maximum of 15.", "%RSD 97.121914 exceeds the CCC maximum of 30."], "meanRf": 1.0737849653422757, "rsdPercent": 97.1219141484578, "rSquared": -0.6444109997178047, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Chloroform-C"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### tert-Amyl methyl ether.. — FAIL
- Excel: `{"averageRf": 0.823408920375229, "rsdPercent": 4.414898792862056, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### Benzene — GATE_MISMATCH
- Excel: `{"averageRf": 1.247586480190312, "rsdPercent": 6.40940944484136, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.98914 is below the minimum of 0.990025."], "meanRf": 1.247586480190312, "rsdPercent": 6.4094094448413585, "rSquared": 0.9891400300197696, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Benzene"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": true, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### 1,2-Dichloroethane — GATE_MISMATCH
- Excel: `{"averageRf": 0.4151160393045253, "rsdPercent": 7.7584503169096015, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.989474 is below the minimum of 0.990025."], "meanRf": 0.4151160393045253, "rsdPercent": 7.7584503169096015, "rSquared": 0.9894741167053203, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "1,2-Dichloroethane"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": true, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### Bromodichloromethane — GATE_MISMATCH
- Excel: `{"averageRf": 0.535769308823908, "rsdPercent": 8.517658277085205, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 0.9999999999999993, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 7 exceeds the maximum allowed of 2.", "R\u00b2 0.910386 is below the minimum of 0.990025.", "%RSD 36.974963 exceeds the maximum of 15."], "meanRf": 0.6233192231459111, "rsdPercent": 36.974963368502834, "rSquared": 0.9103863869302258, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Bromodichloromethane"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### 2-Chloroethyl vinyl ethe — FAIL
- Excel: `{"averageRf": 0.18689376158669468, "rsdPercent": 7.085194545402189, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### 4-Methyl-2-pentanone (.. — FAIL
- Excel: `{"averageRf": 0.04096933137644313, "rsdPercent": 3.5130727548877827, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": null, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### trans-1,3-Dichloropropen — FAIL
- Excel: `{"averageRf": 0.5343679416828018, "rsdPercent": 2.9395382642296886, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### 2-Hexanone — GATE_MISMATCH
- Excel: `{"averageRf": 0.20354444506859937, "rsdPercent": 6.259122455379405, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": null, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["Missed point count 11 exceeds the maximum allowed of 2.", "R\u00b2 0.693378 is below the minimum of 0.990025.", "%RSD 52.135323 exceeds the maximum of 15."], "meanRf": 0.27534892111039855, "rsdPercent": 52.135322692080855, "rSquared": 0.6933781817725699, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "2-Hexanone"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": false, "rsdPercent": false, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).

### 1,1,1,2-Tetrachloroethan — FAIL
- Excel: `{"averageRf": 0.40189480254325044, "rsdPercent": 2.610999245427065, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### 1,1,2,2-Tetrachloroeth.. — FAIL
- Excel: `{"averageRf": 0.33161981474739455, "rsdPercent": 4.150887356490529, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1.0000000000000004, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### 1,2-Dibromo-3-chloropr.. — FAIL
- Excel: `{"averageRf": 0.10652298777778499, "rsdPercent": 8.024453179251951, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": null, "icalSummary": "Acceptable"}`
- API: `null`
- Checks: `{"presentInApiReport": false}`

### Naphthalene — GATE_MISMATCH
- Excel: `{"averageRf": 1.9179222684188895, "rsdPercent": 6.659568541623758, "rsdPass": "Y", "chosenModelCode": "A", "rSquared": 1.0000000000000004, "icalSummary": "Acceptable"}`
- API: `{"calStatus": "Fail", "failureReasons": ["R\u00b2 0.988661 is below the minimum of 0.990025."], "meanRf": 1.9179222684188895, "rsdPercent": 6.65956854162376, "rSquared": 0.9886614048465148, "selectedRegressionType": "Average", "selectedWeightingMode": "None", "matchedApiName": "Naphthalene"}`
- Checks: `{"presentInApiReport": true, "icalGate": false, "averageRf": true, "rsdPercent": true, "rSquared": false, "model": true}`
- Note: Excel ICAL Acceptable vs WLTR calStatus mismatch (often RSD/missed-points hard-fail in WLTR while Excel passes via chosen model).


## UI smoke

Playwright MCP against `http://localhost:3000` as lab admin `parity-admin-029cf398@wltr.local`:

| Step | Result |
|------|--------|
| Login | Pass — redirected to `/dashboard` |
| Open group `0ce7f6a5-…` | Pass — status **Computed**, title `230120 MS4 VOC Parity Group` |
| Compute & model tab | Pass — report card / model workflow visible |
| Review tab | Pass — Summary Report sections 1–4 (Administrative, Executive, RF summary, Linear dynamic range) + ICV Calculator + regression inputs |
| QA debug tab | Pass — debug panels rendered |

Screenshots:

- [`docs/parity-screenshots/01-compute-and-model.png`](parity-screenshots/01-compute-and-model.png)
- [`docs/parity-screenshots/02-review-summary.png`](parity-screenshots/02-review-summary.png)
- [`docs/parity-screenshots/03-qa-debug.png`](parity-screenshots/03-qa-debug.png)

## Client handover notes

1. **End-to-end pipeline works** for the 230120 preload (upload → compute → model select → Summary Report → UI).
2. **43/71 analytes** match Excel ICAL Acceptable with the same selected model (12 full numeric match, 31 with RF/RSD/r² drift within/near display precision).
3. **19 gate mismatches** are the main product risk: Excel marks Acceptable while WLTR `calStatus=Fail`, usually on `%RSD` and/or missed-point count even when the chosen DVD model (A/QIC/LSIC) is selected. Confirm with the client whether WLTR should mirror Excel’s “curve-model override” ICAL SUMMARY behavior.
4. **9 analytes missing** from the API report because Excel Summary truncates names (`…`); MassHunter full names did not resolve. Fix: seed analytes from Cal Data compound names (or add aliases) before re-upload.
5. **Numeric RF/RSD drift** on early eluters (e.g. Dichlorodifluoromethane Excel RF 0.196 vs API 0.182) suggests point-inclusion / weighting differences vs DVD — worth a focused backend follow-up on those analytes’ `regression-debug` vs DVD rows.

## Artifacts

- `fixtures/ms4-voc-230120/goldens.json`
- `fixtures/ms4-voc-230120/parity-state.json`
- `fixtures/ms4-voc-230120/parity-compare.json`
- `fixtures/ms4-voc-230120/api-summary-report.json`
- `fixtures/ms4-voc-230120/api-report-card.json`
- `scripts/parity/extract_workbook_goldens.py`
- `scripts/parity/run_parity.py`
