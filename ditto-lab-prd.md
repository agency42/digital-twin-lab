This document outlines the development path for Ditto Lab, from the initial V1 implementation to the more advanced V2 vision. It provides a clear progression strategy for each feature area.

---

# 1. Overview

### 1.1 Purpose

Ditto Lab is an app that enables users to quickly create and iterate on AI personalities using content they upload as seed data. Users can create, test, and interact with AI personalities that mirror specific traits, writing styles, and behavioral patterns, primarily for automated content creation and persona exploration. The long-term goal is to arrive at an interface where the user can interact with an AI agent that can update its own personality through conversation with the user.

### 1.2 Target Users
- Content creators seeking to automate their online presence
- **Startup founders and Agency founders** needing to automate content creation for marketing
- Researchers studying AI personality simulation
- Prompt engineers experimenting with character creation
- Individuals interested in creating digital versions of themselves


### 1.3 Development Philosophy

- **V1**: Focus on core functionality with a structured interface similar to prompt playgrounds
- **V2**: Evolve to a conversational (tool use) agent interface where the AI can self-modify its prompt to help iterate on personality

# 2. Core Features Evolution

## 2.1 Character & Content Library

### **V1: Basic Content Management**

- User selects or creates a new character with a unique ID
- Content collection through structured upload interfaces:
    - Basic text file uploads (.txt, .doc, .pdf)
    - Simple website scraping
- Manual content organization and selection
- First character card generated from initial upload set

### **V2: Advanced Content Ecosystem**

- Dynamic content collection with rich media support:
    - Linkedin/Twitter/Instagram login/scrape
    - Image content analysis
    - Advanced document parsing
- Content feedback loop: Generated posts saved to library
- Content tagging and metadata for contextual usage
- Sync with drafts/approval/editor page to edit posts

## 2.2 Personality Assessment

### **V1: Structured Assessment**

- User takes the [TIPI](https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/) test
- Model simulates answers to each question through separate calls
- Multiple parallel runs for each question for speed and reliability
- Basic radar chart comparison between user and character

### **V2: Conversational Assessment**

- Assistant dynamically asks personality questions in chat
- Questions adapted based on conversation context
- User can add content to context (similar to doc reference in Cursor)
- Real-time personality profile updates during conversation
- More sophisticated visualization of personality attributes

## 2.3 Character Card Generation & Management

### **V1: JSON-Based Character Cards**

- Generation of structured JSON character cards from content
- Manual selection of content for character generation
- Raw JSON editing of character attributes
- Basic management of multiple character cards
- Simple "set as active" functionality

### **V2: Visual Character Interface**

- GUI representation of character attributes
- Visualization of character traits
- Self-modification through conversation:
    - Model updates its own JSON via tool calls
    - "Can you be more assertive?" → automatic trait adjustment
- Character evolution tracking over time
- Automatic assessment after modifications

## 2.4 Digital Twin Playground Interface

### **V1: Structured Playground (OpenAI-inspired)**

- Separate, distinct editable sections:
    - System Prompt (derived from Character Card)
    - Instructions (separate for Chat/Post modes)
    - Examples (separate for Chat/Post modes)
    - Main Goal/User Input area
- Mode toggle between Chat and Post generation
- Explicit Generate/Send buttons for different modes
- Basic personality visualization (radar chart)

### **V2: Unified Conversational Interface**

- Single chat interface for all interactions
- No mode switching - everything happens in conversation
- Tool-based post generation within the chat, sends to our drafts/editor/approval system
- Dynamic example inclusion based on content tags
- Instruction generation from examples
    - (potentially locked/standard instructions for different platforms e.g., ‘max 280 chars. don’t use hashtags’ for twitter)
- Simplified UI focusing on conversation

## 2.5 Advanced Conversation & Tool Capabilities

### **V1: Basic Interaction**

- Simple text-based chat responses
- Static character attributes
- Separate interface for post generation
- Basic text formatting for outputs

### **V2: Tool-Powered Interaction**

- Self-modifying character json via tool calls
- In-conversation post generation via tool calls
- Post previews embedded in chat
- Rich media support (embeds, images, links)
- Research capabilities via Perplexity search integration (to research & make posts via chat)
- Continuous improvement through growing content library of posts

# 3. User Flows Evolution

## 3.1 Initial Setup Flow

### **V1**

1. User selects or creates a character (gets unique ID)
2. User manually uploads files to content library or scrapes website
3. User takes personality assessment through form interface
4. System generates Character Card JSON from selected content
5. System runs personality assessment on the Character Card

### **V2**

1. User selects or creates a character
2. Option to upload content, integrate social, or scrape website
3. Conversational interface starts with a model asking the user about themselves or the character they want to create
4. Model can take new files and examples in context at anytime like cursor  (drag & drop, URL, etc)
5. Personality assessment scores generate through natural conversation
6. Dynamic character card creation through conversation
7. Continuous refinement based on interaction

## 3.2 Character Card Generation Flow

### **V1**

1. User navigates to dedicated Character Card management section
2. User manually selects content from library
3. User triggers generation with explicit button
4. System generates JSON Character Card
5. User views the JSON and assessment results
6. User manually sets as "active" Character Card

### **V2**

1. Character generation available directly in chat
2. Content selection through conversation or tags
3. Visual representation of generated character
4. Automatic personality assessment
5. Character refinement through conversation
6. Seamless switching between characters

## 3.3 Interaction Flow

### **V1: Structured Playground Interaction**

1. User navigates to Playground Interface
2. Interface loads Character Card, Instructions, Examples
3. User selects mode (Chat/Post)
4. User edits Instructions/Examples if needed
5. User enters message or post goal
6. User clicks appropriate button (Send/Generate)
7. Backend constructs prompt from components
8. Response displayed in output area
9. User iterates by changing components or input

### **V2: Conversational Interaction**

1. User engages in natural conversation with character
2. User can request personality modifications conversationally
3. Character updates itself using tool calls
4. User requests content generation naturally in conversation
5. AI generates post previews via tool calls
6. User reviews, edits, approves posts
7. Approved content can feed back into character refinement
8. Seamless research capabilities during conversation

# 4. Success Criteria

## 4.1 V1 Success Metrics

- Simple content library management system
- Functional character card json generation from content
- Directionally accurate personality assessment
- User-editable instructions and examples
- Basic chat and post generation capabilities

## 5.2 V2 Success Metrics

- Advanced social integrations with content library
- Seamless conversational character iteration
- Successful self-modification of character attributes
- Post generation via tool calls with generative UI
- Effective research-augmented content creation within chat
- Positive user feedback on simplified interface

---

*Written by Ken and Claude.*