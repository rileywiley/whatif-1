# AI integration

## Overview

WhatIf-1 uses the Anthropic Claude API (model: `claude-sonnet-4-20250514`) for three capabilities:

1. **Narrative generation** — explain what-if results in natural language
2. **Query parsing** — convert natural language questions to simulation parameters
3. **Per-lap commentary** — provide context during race replay

All AI calls use `max_tokens=1024` unless specified otherwise.

## Anthropic API setup

```python
from anthropic import Anthropic

client = Anthropic()  # uses ANTHROPIC_API_KEY env var

def call_claude(system: str, user: str, max_tokens: int = 1024) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text
```

## 1. Narrative generation

### When called
After every simulation completes, before returning the result to the user.

### System prompt

```
You are a Formula 1 race analyst for the WhatIf-1 app. You explain alternative race outcomes in a clear, engaging style that both hardcore fans and newcomers can understand.

Rules:
- Write 2-4 sentences maximum
- Lead with the most dramatic change (e.g., "Norris wins instead of Leclerc")
- Explain the causal chain: what the modification changed → what cascade it caused → final result
- Use specific numbers (lap times, gaps, positions) when they strengthen the story
- Name drivers by surname only (Norris, not Lando Norris)
- Never use hedging language ("might have", "could have"). Speak as if describing what DID happen in the simulation.
- If the scenario has low confidence (<0.5), add a brief caveat at the end.
```

### User prompt template

```
Race: {race_name} ({year})
Circuit: {circuit_name}

Scenario modifications:
{modifications_list}

Actual finish order (top 10):
{actual_order}

Simulated finish order (top 10):
{simulated_order}

Key position changes:
{position_changes}

Key divergence lap: {divergence_lap}
Confidence: {confidence_score}

Write a race analysis explaining why the outcome changed.
```

### Example input/output

Input:
```
Race: Australian Grand Prix (2025)
Circuit: Albert Park

Scenario modifications:
- Removed Safety Car (laps 13-16)
- Leclerc pit 1 moved from lap 9 to lap 16

Actual finish order: 1.LEC 2.NOR 3.VER 4.HAM 5.PIA 6.HUL 7.RUS 8.GAS
Simulated finish order: 1.NOR 2.LEC 3.RUS 4.VER 5.PIA 6.HAM 7.GAS 8.HUL

Key position changes:
- NOR: P2 → P1 (+1)
- LEC: P1 → P2 (-1)
- RUS: P7 → P3 (+4)
- HAM: P4 → P6 (-2)

Key divergence lap: 16
Confidence: 0.78
```

Output:
```
Without the safety car on lap 13, Leclerc's early pit on lap 9 becomes a costly mistake rather than a masterstroke. He loses the "free" tyre change that compressed the field, and his worn hards in the final stint cost him 0.4s/lap against Norris on fresher rubber. Russell is the biggest beneficiary — his long first stint on mediums was the fastest strategy on paper, but the SC erased his 8-second gap. Without it, he maintains clean air through his stops and emerges P3.
```

## 2. Query parsing

### When called
When a user submits a natural language question via the AI chat interface or reverse-query endpoint.

### System prompt

```
You are a query parser for the WhatIf-1 Formula 1 simulation app. Convert the user's natural language question about an F1 race into a structured JSON command.

You must return ONLY valid JSON, no other text.

There are two query types:

TYPE 1: "forward" — the user wants to simulate a specific change
Return:
{
  "type": "forward",
  "scenario": {
    "pit_overrides": {...} or null,
    "event_overrides": [...] or null,
    "weather_overrides": [...] or null,
    "driver_overrides": {...} or null,
    "race_param_overrides": {...} or null,
    "description": "human-readable description"
  }
}

TYPE 2: "solve" — the user wants to know what conditions would be needed for an outcome
Return:
{
  "type": "solve",
  "goal": {
    "goal_type": "beat|win|podium|points|position",
    "driver": "3-letter driver code",
    "target_driver": "3-letter code or null",
    "target_position": int or null,
    "parameter": "pace_offset|pit_lap_1|pit_lap_2|tyre_compound",
    "search_range": [min, max]
  }
}

TYPE 3: "analysis" — the user wants comparative analysis, not a simulation
Return:
{
  "type": "analysis",
  "analysis": {
    "question_type": "who_benefited_most|optimal_strategy|compare_strategies",
    "subject_driver": "3-letter code or null",
    "event_focus": "event_id or null",
    "description": "what to analyze"
  }
}

Available driver codes for this race:
{driver_codes}

Available events for this race:
{events_list}
```

### User prompt template

```
Race context: {race_name} ({year}), {total_laps} laps at {circuit_name}
Winner: {winner}

User's question:
"{user_question}"
```

### Example parses

| User question | Parsed type | Key fields |
|---|---|---|
| "What if Hamilton had pitted 3 laps earlier?" | forward | pit_overrides for HAM |
| "What if there was no safety car?" | forward | event_overrides: REMOVE |
| "What lap time would Verstappen need to win?" | solve | goal_type: "win", driver: "VER", parameter: "pace_offset" |
| "What if it rained from lap 30?" | forward | weather_overrides: add rain |
| "Who benefited most from the safety car?" | analysis | question_type: "who_benefited_most" |
| "What's the fastest strategy for Piastri?" | analysis | question_type: "optimal_strategy" |

### Error handling

If the query can't be parsed, return:
```json
{
  "type": "error",
  "message": "I couldn't understand that question. Try asking something like 'What if Norris pitted on lap 20 instead?' or 'What would Verstappen need to win?'"
}
```

## 3. Per-lap commentary

### When called
During lap-by-lap replay, when the user scrubs to a new lap or the playback advances. Can be called for every lap or every N laps to reduce API calls.

### Batching strategy
To minimize API calls, request commentary for 5 laps at a time and cache. Pre-generate commentary for "key laps" (pit stop laps, overtake laps, event start/end laps) during simulation.

### System prompt

```
You are a Formula 1 race commentator providing lap-by-lap analysis for a simulated race in the WhatIf-1 app.

Rules:
- Write exactly 1-2 sentences per lap
- Focus on the most interesting thing happening THIS lap: a gap closing, an overtake, a pit stop, tyres falling off a cliff, a strategy paying off
- Use present tense as if watching the race live
- Reference specific numbers (gap, lap time, tyre age) to ground the commentary
- On laps where nothing notable happens, note the status quo briefly ("Norris maintains a steady 3.2s lead, both drivers managing their tyres")
- Never repeat the same observation on consecutive laps
```

### User prompt template

```
Race: {race_name} (simulated, {scenario_description})
Lap {lap_number} of {total_laps}

Current standings:
{position_tower}

This lap's key data:
- Fastest on track: {fastest_driver} ({fastest_time})
- Biggest gap change: {gap_change_driver} ({gap_direction} {gap_amount}s on {target_driver})
- Pit stops this lap: {pit_events}
- Active event: {active_event_or_none}
- Weather: {weather_state}

Previous lap commentary: "{previous_commentary}"

Write lap {lap_number} commentary.
```

## 4. AI suggestions generation

### When called
During race ingestion (once per race) or on-demand for the race selector page.

### System prompt

```
You are a Formula 1 strategy analyst. Given a race's events and results, suggest the 2-3 most interesting "what if" scenarios that would produce dramatically different outcomes.

Rules:
- Focus on scenarios with high dramatic impact (winner changes, multiple position swaps)
- Prefer scenarios that involve real race events (safety cars, weather, penalties) over hypothetical pace changes
- Each suggestion should be a single sentence question starting with "What if..."
- Include a brief impact summary (1 sentence)
- Return valid JSON only
```

### Response format

```json
{
  "suggestions": [
    {
      "description": "What if the safety car hadn't happened on lap 13?",
      "impact_summary": "Biggest swing race — estimated 6 position changes in top 10",
      "scenario_params": {
        "event_overrides": [{"event_id": "2025-aus-sc-1", "action": "REMOVE"}]
      }
    }
  ]
}
```

## 5. Analysis queries (type 3)

For comparative analysis questions that don't require running a full simulation, the AI examines the existing race data and runs targeted micro-simulations.

### "Who benefited most from the safety car?"

1. Run the sim with SC removed → get position changes
2. The driver with the biggest positive delta (actual_pos - sim_pos) benefited most
3. Generate narrative explaining why

### "What's the fastest strategy for Piastri?"

1. Generate candidate strategies: all viable 1-stop and 2-stop combinations
2. Run batch simulations (one per strategy) with only PIA's pit_overrides changed
3. Rank by finishing position, then by cumulative time
4. Return top 3 with lap time comparisons

## API cost management

- Narrative generation: ~200 input tokens + ~150 output tokens per call (~$0.001)
- Query parsing: ~300 input tokens + ~100 output tokens (~$0.001)
- Commentary: ~400 input tokens + ~50 output tokens per lap (~$0.001)
  - Full race replay (58 laps): ~$0.06
  - With batching (5-lap chunks): ~$0.012
- Suggestions: ~500 input tokens + ~200 output tokens per race (~$0.002)

Estimated cost per user session: $0.01-0.05 depending on replay usage.

## Caching AI responses

- Narrative: cache with scenario hash, expire 7 days
- Query parsing: no cache (unique per query)
- Commentary: cache per scenario_id + lap_number, expire 7 days
- Suggestions: cache per race_id, expire 30 days
