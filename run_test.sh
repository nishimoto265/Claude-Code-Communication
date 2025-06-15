#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Automated Test..."

# 1. Run setup.sh
echo "🔧 Running setup.sh..."
./setup.sh
if [ $? -ne 0 ]; then
    echo "❌ Error: setup.sh failed. Exiting."
    exit 1
fi
echo "✅ setup.sh completed successfully."
echo ""

# Simulate Claude startup delay (optional, but good for mimicking real conditions)
# In a real scenario, we'd need to wait for Claude to be ready.
# For this test, we assume tmux send-keys for claude startup (in setup.sh) is enough.

# 2. Send messages using agent-send.sh
MESSAGE_WORKER="Automated Test: Ping"
MESSAGE_BOSS="Automated Test: Pong"

echo "💬 Sending message to worker: '$MESSAGE_WORKER'"
./agent-send.sh worker "$MESSAGE_WORKER"
if [ $? -ne 0 ]; then
    echo "❌ Error: agent-send.sh failed to send message to worker. Exiting."
    exit 1
fi
echo "✅ Message sent to worker."
echo ""

echo "💬 Sending message to boss: '$MESSAGE_BOSS'"
./agent-send.sh boss "$MESSAGE_BOSS"
if [ $? -ne 0 ]; then
    echo "❌ Error: agent-send.sh failed to send message to boss. Exiting."
    exit 1
fi
echo "✅ Message sent to boss."
echo ""

# 3. Verify logs
LOG_FILE="logs/send_log.txt"
echo "🔎 Verifying log file: $LOG_FILE..."

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Error: Log file '$LOG_FILE' not found. Exiting."
    exit 1
fi

# Check for worker message
# Using grep -F for fixed string search and -q for quiet mode
if ! grep -Fq "worker: SENT - \"$MESSAGE_WORKER\"" "$LOG_FILE"; then
    echo "❌ Error: Worker message '$MESSAGE_WORKER' not found in log file. Exiting."
    cat "$LOG_FILE" # Print log content for debugging
    exit 1
fi
echo "✅ Worker message found in log."

# Check for boss message
if ! grep -Fq "boss: SENT - \"$MESSAGE_BOSS\"" "$LOG_FILE"; then
    echo "❌ Error: Boss message '$MESSAGE_BOSS' not found in log file. Exiting."
    cat "$LOG_FILE" # Print log content for debugging
    exit 1
fi
echo "✅ Boss message found in log."
echo "✅ Log verification successful."
echo ""

# 4. Kill tmux session
echo "🧹 Killing tmux session 'multiagent'..."
tmux kill-session -t multiagent
if [ $? -ne 0 ]; then
    echo "⚠️ Warning: tmux kill-session -t multiagent failed. This might be okay if session already ended."
    # Depending on strictness, you might exit 1 here.
    # For now, we'll treat it as a warning.
fi
echo "✅ tmux session 'multiagent' targeted for termination."
echo ""

# 5. Make the script executable (self-modification, typically done once outside)
# chmod +x run_test.sh # This line is more for instruction, will be done by a separate tool call.

echo "🎉 Automated test completed successfully."
exit 0
