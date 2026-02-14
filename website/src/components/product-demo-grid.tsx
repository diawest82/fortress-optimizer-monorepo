import DemoCard from "@/components/demo-card";

const demos = [
  {
    title: "npm package",
    channel: "SDK",
    description: "Optimize prompts before they reach your model gateway.",
    sample:
      "Please generate a very comprehensive and highly detailed and thorough release summary for the new and improved API version and also please include extensive and comprehensive migration notes and documentation for all of our customers and partners. Make sure to cover absolutely all breaking changes and new features and improvements in great detail. Please provide clear examples and detailed explanations for each change so customers and developers understand the full impact on their systems and workflows. Include information about performance improvements, security enhancements, new capabilities, deprecated features, and recommended upgrade paths. Also provide troubleshooting guides and FAQ sections to help developers migrate smoothly. Include code samples, configuration examples, and best practices for using the new API effectively.",
    minSavings: 16,
    maxSavings: 20,
  },
  {
    title: "GitHub Copilot",
    channel: "IDE",
    description: "Keep coding assistance short, actionable, and context aware.",
    sample:
      "Can you please help me refactor this entire React component so that it is much more performant and faster and easier to read and maintain in the editor? I want to optimize the rendering performance and improve the overall code quality and structure significantly with modern patterns and practices. Please suggest best practices and patterns for React development. Consider component composition, hooks usage, memoization strategies, and performance optimization techniques. Also review the component for accessibility improvements, error handling, type safety, and testing capabilities. Provide specific recommendations for each area and show me examples of how to implement these improvements step by step.",
    minSavings: 14,
    maxSavings: 18,
  },
  {
    title: "VS Code extension",
    channel: "Workspace",
    description: "Compress multi-file context before it hits the LLM.",
    sample:
      "Please summarize the open and modified workspace changes and list the top 3 most critical and important risks we should address before merging the code into production systems. Include specific recommendations and action items for each risk identified with details about remediation. Consider performance impact on our systems, security concerns and vulnerabilities, maintainability aspects and technical debt, code review comments and feedback. Also analyze dependencies and compatibility issues that might arise from these changes. Provide estimates of effort required to address each risk and suggest the best sequence for implementation. Include test coverage requirements and deployment considerations.",
    minSavings: 18,
    maxSavings: 20,
  },
  {
    title: "Slack bot",
    channel: "Chat",
    description: "Keep incident responses short but accurate under pressure.",
    sample:
      "Hey team, can someone please provide a comprehensive and detailed status update on the current outage situation affecting our services and systems and the specific remediation steps and actions we are taking to resolve this critical issue as quickly as possible. Include timeline information about when the issue started and expected resolution time. Also provide details about what services are affected, how many users are impacted, what the root cause appears to be so far, and what we are doing to prevent similar incidents in the future. Include information about communication status with customers and any escalations.",
    minSavings: 15,
    maxSavings: 19,
  },
  {
    title: "Claude Desktop",
    channel: "Assistant",
    description: "Save tokens across multi-turn support and analysis flows.",
    sample:
      "Please perform a very detailed and comprehensive analysis of the quarterly customer feedback data and information we have collected from multiple sources including surveys, support tickets, and user interviews to identify patterns and trends. Identify the most urgent and important themes and recommended follow-up actions for improvement of our products and services. Consider both positive feedback and complaints to understand customer satisfaction levels and areas needing improvement. Provide actionable insights that can guide product development and customer success initiatives. Include specific recommendations for addressing the most critical feedback items and suggestions for how to track improvement over time.",
    minSavings: 14,
    maxSavings: 17,
  },
];

export default function ProductDemoGrid() {
  return (
    <section className="mt-12">
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
          Live demos
        </p>
        <h2 className="text-3xl font-semibold text-white">
          Interactive channels, one optimizer
        </h2>
        <p className="max-w-2xl text-sm text-slate-400">
          Each integration ships with the same realtime compression engine. Try
          each channel and watch token counts update instantly.
        </p>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {demos.map((demo) => (
          <DemoCard key={demo.title} {...demo} />
        ))}
      </div>
    </section>
  );
}
