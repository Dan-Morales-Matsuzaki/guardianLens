# intent_classifier.py
from transformers import pipeline

# Load zero-shot classification model (smaller = faster)
classifier = pipeline(
    "zero-shot-classification",
    model="valhalla/distilbart-mnli-12-1"  # You can also try "facebook/bart-large-mnli"/"valhalla/distilbart-mnli-12-1"
)

# Define our possible intents
labels = ["SAFE", "HELP"]

# Example phrases to test
sample_phrases = [
    "I'm okay, just tripped a little.",
    "I don't know, I feel dizzy.",
    "Please help me, I can't move.",
    "It's nothing, I'm fine.",
    "I feel some pain in my back.",
    "Can you call an ambulance?",
]

print("Guardian Lens - Intent Classification Test\n")
for text in sample_phrases:
    result = classifier(text, labels)
    # Get best label
    best_intent = result["labels"][0]
    confidence = result["scores"][0]
    print(f"Text: {text}")
    print(f"Predicted intent: {best_intent} (confidence: {confidence:.2f})")
    print("-" * 50)