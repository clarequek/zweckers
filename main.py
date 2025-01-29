import spacy
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt
from itertools import combinations
from flask import Flask, jsonify,render_template, request
from groq import Groq
import os
import re

dct = []
df = []
app = Flask(__name__)
### Pre-loading the excel
def pre_load_excel(excel):
    # Load English language model
    nlp = spacy.load("en_core_web_sm")
    global df
    df = pd.read_excel(excel)
    records = []
    for doc_text in df["Text"]:
        doc = nlp(doc_text)
        for ent in doc.ents:
            records.append((doc_text, ent.text, ent.label_))
    ner_graph_df = pd.DataFrame(records, columns=["original_text", "entity", "label"])
    return ner_graph_df

### Button Activation
def preset_ner_dct(ner_graph_df):
    ner_list = list(ner_graph_df['label'].unique())
    dct = {}
    for n in ner_list:
        x = {}
        dct[n] = x
        for i, v in enumerate(ner_graph_df['entity']):
            if ner_graph_df['label'][i] == n:
                x[v] = False

    return dct

## NER Updating
def update_ner(type, v, dct):
    try:
        dct[type][v] = True
    except:
        raise ValueError()

def filter(dct, approve=False):
    # Filtering logic here
    return

def get_true_keys(data_dict):
    true_keys = []
    for category, entities in data_dict.items():
        for entity, is_selected in entities.items():
            if is_selected:
                true_keys.append(entity)
    return true_keys


def filtered_df(df, v):
    filtered_df = df[df['entity'].isin(v)]
    return list(filtered_df['original_text'].unique())


# Simple Flask routes to demonstrate returning JSON
@app.route("/")
def index():
    # Return minimal inline HTML as a placeholder
    return render_template("v.html")

@app.route("/get_dct")
def get_dct():
    print("testing")
    # Example usage with a fake file; replace with a real path
    ner_graph_df = pre_load_excel("news_excerpts_parsed.xlsx")
    global dct
    global df
    df = ner_graph_df
    print(ner_graph_df['label'])
    dct = preset_ner_dct(ner_graph_df)
    return jsonify(dct)

@app.route("/load_ner")
def load_ner():
    print("after testing, we can pre load a cached ner")
    return jsonify(dct)

@app.route("/update_dct", methods=["POST"])
def update_dct():
    global dct
    updated_data = request.get_json()  # e.g. { "ORG": {"NLRB": true, ...}, ... }
    if updated_data:
        dct = updated_data
    filtered_keys = get_true_keys(dct)
    filtered_sentences = filtered_df(df, filtered_keys)
    raw_json = get_relationship(filtered_sentences)
    final_json = extract_json_from_output(raw_json)
    return jsonify(final_json)


def get_relationship(PROMPT, model="deepseek-r1-distill-llama-70b", MaxToken=5000, outputs=2, temperature=0.7):
    client = Groq(api_key="")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": (
                    "Extract entities and relationships from the following text. "
                    "For relationships, standardize the use of 'source', 'target', 'relation'. "
                    "Format your response in STRICT JSON with the following structure: "
                    "{"
                    "  \"entities\": [{\"name\": <entity_name>, \"attributes\": [<attributes>]}], "
                    "  \"relationships\": [{\"source\": <entity_name>, \"target\": <entity_name>, \"relation\": <relationship_type>}] "
                    "}. "
                    "The name and attributes should be specific to the context given by the input. "
                    f"Respond in STRICT JSON format with 'entities' and 'relationships' keys only: {PROMPT}"
                )
            }
        ],
        temperature=temperature,
        max_completion_tokens=MaxToken,
        top_p=0.95,
        stream=False,
        stop=None,
    )

    return response.choices[0].message.content

def extract_json_from_output(output):
    # Use regex to find the JSON part
    match = re.search(r'```json(.*?)```', output, re.DOTALL)
    if match:
        json_part = match.group(1).strip()
        return json_part
    else:
        return None

if __name__ == "__main__":
    app.run(debug=True)