# AI Creative Pipeline - Plan

## Översikt

En multi-agent approach där tre AI-modeller (Claude, GPT-4, Gemini) samarbetar för att skapa högkvalitativa produkter genom generering, feedback, iteration och röstning.

## Flöde

### Round 1: Generera
Alla tre modeller genererar varsitt förslag baserat på samma input.

### Round 2: Feedback
Varje modell ser de andra två förslagen och ger konstruktiv feedback:
- Vad är bra?
- Vad kan förbättras?
- Specifika förslag

### Round 3: Iterera
Varje modell förbättrar sin egen version baserat på feedbacken den fick.

### Round 4: Rösta
Varje modell röstar på de andra två versionerna (ej sin egen).
Modellen måste motivera sitt val.

### Resultat
- Vinnande version presenteras
- Alla versioner tillgängliga för admin
- Sammanfattning av varför vinnaren valdes

## Visualisering

```
   Claude              GPT-4              Gemini
     │                   │                   │
     ▼                   ▼                   ▼
 [Förslag A]        [Förslag B]        [Förslag C]
     │                   │                   │
     └───────────────────┴───────────────────┘
                         │
                    [Feedback]
                         │
     ┌───────────────────┼───────────────────┐
     ▼                   ▼                   ▼
 [A v2.0]            [B v2.0]            [C v2.0]
     │                   │                   │
     └───────────────────┴───────────────────┘
                         │
                     [Röstning]
                         │
                         ▼
                    [Vinnare 🏆]
```

## Regler

1. **Ingen röstar på sig själv** - garanterar objektivitet
2. **Feedback måste vara konstruktiv** - inte bara kritik
3. **Max 1 iteration** - för att hålla kostnader nere
4. **Admin har sista ordet** - kan välja runner-up

## Implementation

Se `/src/lib/ai/pipeline/` för implementation.
