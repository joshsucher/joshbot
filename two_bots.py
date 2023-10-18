import openai
import textwrap

# Initialize OpenAI API client
openai.api_key = 'YOUR_OPENAI_API_KEY'

def chat_with_bot_one(history):
    response = openai.ChatCompletion.create(
        model="BOT_ONE_MODEL",
        temperature=0.9,
        max_tokens=512,
        top_p=0.9,
        messages=history
    )
    return response.choices[0].message['content']

def chat_with_bot_two(history):
    response = openai.ChatCompletion.create(
        model="BOT_TWO_MODEL",
        temperature=0.9,
        max_tokens=256,
        top_p=0.9,
        messages=history
    )
    return response.choices[0].message['content']

def print_chat_message(bot_name, message, justify_right=False):
    terminal_width = 80
    prefix_space = len(bot_name) + 5
    wrapped_message = textwrap.wrap(message, width=30)
    
    if justify_right:
        # Indent the Bot Two label 47 characters from the left
        print(f"{' ' * 47}{bot_name}:")
    else:
        print(f"{bot_name}:")
    
    for line in wrapped_message:
        if justify_right:
            # Indent carat for Bot Two by 48 characters
            print(f"{' ' * 48}> {line.rjust(terminal_width - prefix_space - 48)}")
        else:
            print(f"  > {line}")
    print("-" * terminal_width)

def main():
    initial_message = "What's new?"

    bot_one_history = [
        {
            "role": "system",
            "content": "You are a good friend."
        },
        {
            "role": "assistant",
            "content": initial_message
        }
    ]

    bot_two_history = [
        {
            "role": "system",
            "content": "You are a good friend."
        },
        {
            "role": "user",
            "content": initial_message
        }
    ]

    print_chat_message("Bot One", bot_two_history[-1]['content'])  # Print the initial message

    for _ in range(10):
        # Bot Two's turn
        response_two = chat_with_bot_two(bot_two_history)
        bot_two_history.append({
            "role": "assistant",
            "content": response_two
        })
        print_chat_message("Bot Two", response_two, justify_right=True)

        # Bot One's turn
        bot_one_history.append({
            "role": "user",
            "content": response_two
        })
        response_one = chat_with_bot_one(bot_one_history)
        bot_one_history.append({
            "role": "assistant",
            "content": response_one
        })
        print_chat_message("Bot One", response_one)

        # The response from Bot One becomes the next prompt for Bot Two
        bot_two_history.append({
            "role": "user",
            "content": response_one
        })

if __name__ == "__main__":
    main()
