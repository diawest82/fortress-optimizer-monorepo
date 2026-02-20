---
sidebar_position: 2
title: Best Practices
---

# Best Practices

Tips for maximum token savings with Fortress.

## 1. Prompt Structure

### ✅ Good Structure

```
Task: [What you want]
Format: [How you want it]
Context: [Relevant background]
```

**Example**:
```
Task: Write a React component for a login form
Format: TypeScript, with Tailwind CSS
Context: For a SaaS dashboard, mobile-responsive
```

### ❌ Bad Structure

```
"I want to write a React component, you know like a login form, 
and it should be for a SaaS dashboard, and I need TypeScript, 
and Tailwind CSS, and it should work on mobile..."
```

### Savings

Good structure: 22 tokens
Bad structure: 42 tokens
**Improvement: 48% better**

## 2. Be Specific

### ✅ Specific Request

```
"Python function: validate email with regex pattern"
```
(8 tokens)

### ❌ Vague Request

```
"I need help writing a Python function that validates email addresses 
using a regular expression pattern, and it should return true or false 
depending on whether the email is valid or not..."
```
(35 tokens)

### Savings: 77% better

## 3. Use Bullets for Multiple Items

### ✅ Bulleted Format

```
Write a React component with:
- Login form fields
- Form validation
- Error messages
- Loading state
```
(17 tokens)

### ❌ Prose Format

```
"Write a React component that includes a login form with fields 
for username and password, it should have form validation to check 
if the inputs are valid, and it should display error messages if 
the validation fails, and it should also show a loading state while 
processing the login request..."
```
(55 tokens)

### Savings: 69% better

## 4. Abbreviate Clearly

### ✅ Abbreviations

```
"CRUD API endpoints for User model in Node/Express with:
- POST /users (create)
- GET /users/:id (read)
- PUT /users/:id (update)  
- DELETE /users/:id (delete)"
```
(30 tokens)

### ❌ Full Words

```
"Create complete CRUD Application Programming Interface endpoints 
for the User database model in Node.js and Express.js framework. 
Include endpoints for creating users, reading user by identifier, 
updating user information, and deleting users..."
```
(50 tokens)

### Savings: 40% better

## 5. Give Context Upfront

### ✅ Context First

```
Framework: React 18
Purpose: E-commerce product page
Task: Create ProductCard component with:
- Image gallery
- Price display
- Add to cart button
- Stock indicator
```
(28 tokens)

### ❌ Scattered Context

```
"I need a product card component for an e-commerce site. It's built 
with React 18. It should display product images in a gallery format, 
show the price, have an add to cart button, and also show whether 
the product is in stock or not..."
```
(48 tokens)

### Savings: 42% better

## 6. Use Code Blocks

### ✅ Code Block Reference

```
Interface:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

Implement validation function that checks if User is valid
```
(25 tokens)

### ❌ Text Description

```
"Write a TypeScript validation function that checks if an object 
is a valid User. The User should have an id property that is a 
string, a name property that is a string, and an email property 
that is a string. Return true if valid, false otherwise..."
```
(45 tokens)

### Savings: 44% better

## 7. Reuse Fortress Results

### Cache Identical Prompts

If you use the same prompt multiple times, reuse the optimized version:

```javascript
// First time (slow)
const result = optimizer.optimize({ text: prompt1 });

// Use result.optimized
const optimized = result.optimized;

// Reuse same optimized prompt
for (let i = 0; i < 100; i++) {
  // Don't re-optimize, use cached result
  sendToClaude(optimized);
}
```

### Savings: 99% faster for repeated calls

## 8. Avoid Hedging Language

### ✅ Direct

```
"Write Python function: calculate sum of array"
```
(8 tokens)

### ❌ Hedging

```
"Could you maybe possibly write a Python function that perhaps 
calculates the sum of an array? If you have time, that would be 
really great if you could help me with this..."
```
(32 tokens)

### Savings: 75% better

## 9. Remove Pleasantries

### ✅ No Pleasantries

```
"TypeScript: convert string to number with error handling"
```
(8 tokens)

### ❌ With Pleasantries

```
"Hello! Thank you so much for your help. Could you please kindly 
write a TypeScript function that converts a string to a number, 
and it should also handle any errors that might occur? Thanks 
so much for your time!"
```
(39 tokens)

### Savings: 79% better

## 10. Use Fortress in Conversation

### Optimize Each Turn

In multi-turn conversations, optimize each prompt:

**Turn 1**:
```
Original: "Can you explain what a REST API is?"  (9 tokens)
Optimized: "Explain: REST API" (3 tokens)
```

**Turn 2**:
```
Original: "How would I build a REST API in Node?"  (11 tokens)
Optimized: "Build REST API with Node.js" (5 tokens)
```

Over 10 turns: **62% total savings**

## Common Patterns

### API Documentation

❌ Bad:
```
"I want to know what the endpoints are for your API and how to use them 
and what parameters they take and what the response format looks like..."
```
(32 tokens)

✅ Good:
```
"List API endpoints with parameters, request/response format"
```
(10 tokens)

**Savings: 69%**

### Code Explanation

❌ Bad:
```
"Could you please explain this code to me? I don't really understand 
what it does and would appreciate if you could walk me through it..."
```
(28 tokens)

✅ Good:
```
"Explain this code step-by-step"
```
(5 tokens)

**Savings: 82%**

### Error Debugging

❌ Bad:
```
"I'm getting an error message and I'm not sure what it means. 
The error is saying that something is undefined. Can you help me 
figure out what's going on?"
```
(32 tokens)

✅ Good:
```
"Error: [error message]. What causes this? How to fix?"
```
(9 tokens)

**Savings: 72%**

## Tools & Templates

### Email Summarizer Template

```
Summarize email with:
- Main point (1 sentence)
- Action items
- Deadline (if any)
```

### Code Review Template

```
Review code for:
- Performance issues
- Security vulnerabilities
- Best practice violations
- Suggestions for improvement
```

### Research Template

```
Research topic: [topic]
Focus on: [what matters most]
Format: 
- Key findings (3-5 points)
- Sources
- Next steps
```

## Monitoring

### Track Your Savings

Use the Dashboard to:
1. Monitor total savings
2. See savings by topic
3. Identify optimization opportunities
4. Plan budget

### Set Goals

- Daily: 50K token savings
- Monthly: 1.5M token savings
- Yearly: 18M token savings

## Summary Checklist

Before sending a prompt, ask:

- [ ] Is it specific enough?
- [ ] Can I make it shorter?
- [ ] Did I avoid filler words?
- [ ] Is the structure clear?
- [ ] Should I give more context upfront?
- [ ] Can I use a template?
- [ ] Am I hedging too much?

## Next Steps

- [How It Works](./how-it-works) - Technical details
- [Troubleshooting](./troubleshooting) - Common issues
- [API Reference](../api-reference) - Complete docs
