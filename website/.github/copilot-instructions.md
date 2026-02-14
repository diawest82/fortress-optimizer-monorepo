<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
	<!-- Ask for project type, language, and frameworks if not specified. Skip if already provided. -->

- [x] Scaffold the Project
	<!--
	Ensure that the previous step has been marked as completed.
	Call project setup tool with projectType parameter.
	Run scaffolding command to create project files and folders.
	Use '.' as the working directory.
	If no appropriate projectType is available, search documentation using available tools.
	Otherwise, create the project structure manually using available file creation tools.
	-->

- [x] Customize the Project
	<!--
	Verify that all previous steps have been completed successfully and you have marked the step as completed.
	Develop a plan to modify codebase according to user requirements.
	Apply modifications using appropriate tools and user-provided references.
	Skip this step for "Hello World" projects.
	-->

- [x] Install Required Extensions
	<!-- ONLY install extensions provided mentioned in the get_project_setup_info. Skip this step otherwise and mark as completed. -->

- [x] Compile the Project
	<!--
	Verify that all previous steps have been completed.
	Install any missing dependencies.
	Run diagnostics and resolve any issues.
	Check for markdown files in project folder for relevant instructions on how to do this.
	-->

- [x] Create and Run Task
	<!--
	Verify that all previous steps have been completed.
	Check https://code.visualstudio.com/docs/debugtest/tasks to determine if the project needs a task. If so, use the create_and_run_task to create and launch a task based on package.json, README.md, and project structure.
	Skip this step otherwise.
	 -->

- [x] Launch the Project
	Dev server running at http://localhost:3000

- [x] Ensure Documentation is Complete
	Project initialized successfully with all required components and pages.

## Project Summary

**Fortress Token Optimizer Website** - Modern Next.js + TypeScript marketing site.

### Pages
- Home: Hero section with live savings metrics and channel coverage
- Dashboard: Real-time usage metrics with streaming updates
- Install: Setup guides for npm, Copilot, VS Code, Slack, and Claude Desktop
- Pricing: Three-tier pricing model (Starter, Growth, Enterprise)

### Key Components
- **DemoCard**: Interactive token optimizer for each channel
- **HowItWorks**: Real-time optimizer with adjustable levels (1-5)
- **UsageMetrics**: Live dashboard with animated metrics
- **InstallGuides**: Step-by-step integration guides
- **SiteHeader/Footer**: Navigation and branding

### Tech Stack
- Next.js 16 with TypeScript
- Tailwind CSS v4
- Client-side React with real-time calculations

### Development
Dev server: http://localhost:3000 (running)
