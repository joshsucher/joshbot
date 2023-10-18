import sqlite3
import json
import re

def has_excluded_content(message):
    # Regular expression pattern for detecting URLs
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    
    # Check for URLs, 'password', or 'sex' in the message
    if re.search(url_pattern, message) or 'password' in message.lower():
        return True
    
    return False

def is_valid_length(message, min_len=30, max_len=200):
    # Check if message length is within the specified range
    return min_len <= len(message) <= max_len

def extract_qa_pairs(messages):
    training_data = []
    for i in range(len(messages)-1):
        input_msg, input_is_from_me, input_handle_id = messages[i][:3]
        output_msg, output_is_from_me, output_handle_id = messages[i+1][:3]

        # Check if the input and output messages are from the same conversation thread
        if input_handle_id == output_handle_id:
            # Check if the input message is a question, the output message is from you,
            # neither message contains excluded content, and the output message has a valid length
            if (
                input_msg is not None and output_msg is not None and
                input_msg.endswith('?') and input_is_from_me == 0 and 
                output_is_from_me == 1 and not has_excluded_content(input_msg) and 
                not has_excluded_content(output_msg) and is_valid_length(output_msg) and is_valid_length(input_msg)
            ):
                training_data.append({
                    "messages": [
                        {"role": "system", "content": "You are a good friend. Have an original perspective. No response over 150 characters."},
                        {"role": "user", "content": input_msg},
                        {"role": "assistant", "content": output_msg}
                    ]
                })
    return training_data

# Connect to the SQLite database
conn = sqlite3.connect('chat.db')
cursor = conn.cursor()

# Modify the query to extract the handle_id as well
query = """SELECT text, is_from_me, handle_id FROM message ORDER BY date"""
cursor.execute(query)

# Fetch all messages
messages = cursor.fetchall()

# Extract question-answer pairs
training_data = extract_qa_pairs(messages)

# Write the training data to a file
with open('msg_gpt35turbo.jsonl', 'w') as f:
    for pair in training_data:
        f.write(json.dumps(pair) + "\n")