import { UserProfile, JobListing, InterviewQuestion } from "../types";

export const ROLE_BENCHMARKS: Record<
  string,
  {
    requiredSkills: string[];
    recommendedSkills: string[];
    description: string;
    avgSalaryRange: string;
  }
> = {
  "Data Analyst": {
    requiredSkills: ["Python", "SQL", "Excel", "Power BI", "Statistics"],
    recommendedSkills: ["Tableau", "Pandas", "Data Cleaning", "Business Acumen", "A/B Testing"],
    description: "Analyze datasets to extract actionable insights, create visual dashboards, and empower data-informed business decisions.",
    avgSalaryRange: "₹4.5 - ₹8 LPA",
  },
  "Full Stack Developer": {
    requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git"],
    recommendedSkills: ["Tailwind CSS", "REST APIs", "Docker", "MongoDB", "Next.js"],
    description: "Build robust, scalable end-to-end web applications covering responsive frontends, backend APIs, and database persistence.",
    avgSalaryRange: "₹5.5 - ₹11 LPA",
  },
  "Frontend Engineer": {
    requiredSkills: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Tailwind CSS"],
    recommendedSkills: ["Redux / Zustand", "Next.js", "Web Vitals", "Jest / Testing Library", "Responsive UI"],
    description: "Design pixel-perfect, accessible user interfaces with dynamic interactivity and rapid performance across all screen sizes.",
    avgSalaryRange: "₹4.8 - ₹9.5 LPA",
  },
  "Backend Developer": {
    requiredSkills: ["Node.js", "Python", "SQL", "PostgreSQL", "REST APIs", "Git"],
    recommendedSkills: ["Docker", "Redis", "System Design", "Microservices", "JWT / OAuth"],
    description: "Architect high-throughput server backends, database schemas, secure authentication, and resilient API microservices.",
    avgSalaryRange: "₹5.2 - ₹10.5 LPA",
  },
  "Machine Learning Engineer": {
    requiredSkills: ["Python", "Machine Learning", "Scikit-Learn", "Linear Algebra", "SQL", "Statistics"],
    recommendedSkills: ["PyTorch", "TensorFlow", "Pandas", "NLP", "Model Deployment"],
    description: "Train, evaluate, and deploy predictive models and deep learning pipelines on structured and unstructured real-world datasets.",
    avgSalaryRange: "₹6.0 - ₹14 LPA",
  },
  "QA / Test Automation Engineer": {
    requiredSkills: ["Selenium", "Java", "Python", "Manual Testing", "API Testing", "Git"],
    recommendedSkills: ["Cypress", "Postman", "TestNG", "Jira", "CI/CD Pipeline"],
    description: "Ensure software reliability, write automated test scripts, execute regression suites, and validate enterprise web applications.",
    avgSalaryRange: "₹4.0 - ₹7.5 LPA",
  },
  "Cloud / DevOps Engineer": {
    requiredSkills: ["Linux", "Docker", "Git", "AWS", "Bash", "CI/CD"],
    recommendedSkills: ["Kubernetes", "Terraform", "Nginx", "Monitoring (Prometheus)", "Security"],
    description: "Automate software delivery pipelines, manage cloud infrastructure, optimize container orchestration, and ensure system uptime.",
    avgSalaryRange: "₹5.8 - ₹12 LPA",
  },
  "Product / Business Analyst": {
    requiredSkills: ["Excel", "SQL", "Agile / Scrum", "Market Research", "Wireframing"],
    recommendedSkills: ["Power BI", "Jira", "User Stories", "Stakeholder Communication", "A/B Testing"],
    description: "Bridge customer needs and engineering capabilities, define product requirements, and track KPI telemetry.",
    avgSalaryRange: "₹5.0 - ₹9.0 LPA",
  },
};

export const COMMON_SKILLS_LIST = [
  "Python",
  "SQL",
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Excel",
  "Power BI",
  "Statistics",
  "Tableau",
  "Git",
  "Docker",
  "Tailwind CSS",
  "Pandas",
  "PostgreSQL",
  "MongoDB",
  "Java",
  "C++",
  "AWS",
  "Linux",
  "REST APIs",
  "Agile / Scrum",
  "Machine Learning",
  "Data Visualization",
];

export const INTEREST_OPTIONS = [
  "Data Analytics & BI",
  "Web Development",
  "Artificial Intelligence & ML",
  "Cloud Computing & DevOps",
  "Software Testing & QA",
  "Product Management",
  "Cybersecurity",
  "Mobile App Development",
  "FinTech & Banking Tech",
  "Open Source Contribution",
];

// Sample default profile matching user's exact prompt example:
// User Skills: Python, HTML, Basic SQL; Target: Data Analyst
export const DEFAULT_SAMPLE_PROFILE: UserProfile = {
  id: "demo-user-1",
  email: "rahul.sharma@example.com",
  full_name: "Rahul Sharma",
  avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  education: {
    degree: "B.Tech in Computer Science",
    college: "Delhi Technological University",
    branch: "Computer Science & Engineering",
    graduation_year: "2025",
    cgpa: "8.4 / 10.0",
  },
  skills: ["Python", "HTML", "Basic SQL"],
  interests: ["Data Analytics & BI", "Artificial Intelligence & ML", "FinTech & Banking Tech"],
  target_role: "Data Analyst",
  experience_level: "Fresher / 0 Years",
  projects: [
    {
      id: "p1",
      title: "Student Performance EDA & Dashboard",
      description: "Explored grade trends across 2,000 students using Python and Pandas. Generated automated distribution graphs and exported summary reports.",
      tech_stack: ["Python", "Pandas", "Matplotlib", "Jupyter"],
      github_url: "https://github.com/example/student-performance-eda",
    },
    {
      id: "p2",
      title: "Interactive E-Commerce Product Catalog",
      description: "Developed a responsive frontend catalog filtering products by category and rating with semantic HTML and CSS styling.",
      tech_stack: ["HTML", "CSS", "Basic SQL"],
      live_url: "https://example-catalog.dev",
    },
  ],
  plan: "pro_39",
  created_at: new Date().toISOString(),
  onboarding_completed: true,
};

export const SAMPLE_JOBS: JobListing[] = [
  {
    id: "job-1",
    title: "Junior Data Analyst (Fresher 2024-2025)",
    company: "FinEdge Analytics",
    companyLogo: "FA",
    location: "Bengaluru (Hybrid)",
    workMode: "Hybrid",
    salary: "₹5.5 - ₹7.2 LPA",
    experience: "0-1 Years",
    requiredSkills: ["Python", "SQL", "Excel", "Power BI"],
    description: "Join our consumer analytics squad to build automated weekly performance dashboards, validate marketing campaign funnels, and assist senior analysts with clean SQL queries.",
    matchScore: 68,
    matchedSkills: ["Python", "SQL"],
    missingSkills: ["Excel", "Power BI"],
    applied: false,
    saved: true,
    postedAgo: "2 days ago",
  },
  {
    id: "job-2",
    title: "Graduate Business & Data Trainee",
    company: "Apex Global Tech",
    companyLogo: "AG",
    location: "Hyderabad / Remote",
    workMode: "Remote",
    salary: "₹4.8 - ₹6.5 LPA",
    experience: "Fresher",
    requiredSkills: ["Python", "Basic SQL", "Excel", "Statistics"],
    description: "Great starting role for fresh graduates. Comprehensive 3-month onboarding covering business intelligence tools, executive reporting, and statistical modeling.",
    matchScore: 65,
    matchedSkills: ["Python", "Basic SQL"],
    missingSkills: ["Excel", "Statistics"],
    applied: false,
    saved: false,
    postedAgo: "1 day ago",
  },
  {
    id: "job-3",
    title: "Junior Full Stack Engineer (React + Node)",
    company: "HyperScale Cloud",
    companyLogo: "HC",
    location: "Pune / Bengaluru",
    workMode: "Hybrid",
    salary: "₹6.0 - ₹9.0 LPA",
    experience: "0-2 Years",
    requiredSkills: ["JavaScript", "React", "Node.js", "SQL", "Git"],
    description: "Help build next-generation enterprise dashboards. Work directly with senior architects to implement scalable frontend components and write RESTful microservice controllers.",
    matchScore: 35,
    matchedSkills: ["SQL"],
    missingSkills: ["JavaScript", "React", "Node.js", "Git"],
    applied: false,
    saved: false,
    postedAgo: "3 days ago",
  },
  {
    id: "job-4",
    title: "Associate Product Analyst",
    company: "Zeno Payments",
    companyLogo: "ZP",
    location: "Gurugram / Onsite",
    workMode: "Onsite",
    salary: "₹5.0 - ₹7.5 LPA",
    experience: "Fresher",
    requiredSkills: ["SQL", "Excel", "Product Thinking", "Python", "Data Visualization"],
    description: "Analyze daily transaction churn and drop-off metrics for India's fastest-growing fintech gateway. Collaborate with product managers to draft user engagement reports.",
    matchScore: 55,
    matchedSkills: ["SQL", "Python"],
    missingSkills: ["Excel", "Product Thinking", "Data Visualization"],
    applied: false,
    saved: true,
    postedAgo: "4 days ago",
  },
  {
    id: "job-5",
    title: "Data Operations Associate (Entry Level)",
    company: "CloudVibe Solutions",
    companyLogo: "CV",
    location: "Mumbai / Remote",
    workMode: "Remote",
    salary: "₹4.2 - ₹5.8 LPA",
    experience: "0-1 Years",
    requiredSkills: ["Python", "Basic SQL", "HTML"],
    description: "Maintain web scraping pipelines and extract catalog structured data for global retail clients. High immediate match for candidates with fundamental scripting skills!",
    matchScore: 92,
    matchedSkills: ["Python", "Basic SQL", "HTML"],
    missingSkills: [],
    applied: true,
    saved: true,
    postedAgo: "5 hours ago",
  },
];

export const DEFAULT_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "iq-1",
    role: "Data Analyst",
    category: "Technical",
    difficulty: "Beginner",
    question: "What is the key difference between WHERE and HAVING clauses in SQL, and when would you use each?",
    expectedKeyPoints: [
      "WHERE filters individual rows before any aggregations take place.",
      "HAVING filters groups of rows after GROUP BY has aggregated the data.",
      "WHERE cannot be used with aggregate functions like COUNT(), AVG(), or SUM().",
      "HAVING works directly on aggregate values.",
    ],
    sampleApproach: "Explain the order of execution in SQL: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT.",
  },
  {
    id: "iq-2",
    role: "Data Analyst",
    category: "Technical",
    difficulty: "Intermediate",
    question: "How do you handle missing or null values in a dataset using Python Pandas, and how do you decide whether to impute or drop them?",
    expectedKeyPoints: [
      "Identifying nulls using df.isnull().sum() or info().",
      "Dropping rows/columns with dropna() if percentage of missing data is negligible (<5%) or irrelevant.",
      "Imputing with mean/median for numerical data (median if skewed with outliers).",
      "Imputing with mode for categorical data or using forward/backward fill for time-series.",
      "Business context dictates if missingness is informational (MNAR) vs random (MCAR).",
    ],
    sampleApproach: "Demonstrate both code syntax and analytical decision criteria.",
  },
  {
    id: "iq-3",
    role: "Data Analyst",
    category: "Scenario",
    difficulty: "Intermediate",
    question: "A company's executive notices that overall user signups jumped by 20% last week, but revenue dropped by 5%. How would you investigate this discrepancy?",
    expectedKeyPoints: [
      "Segment signups by source/campaign (e.g. low-quality ad campaign, bot traffic, free trial vs paid).",
      "Analyze average order value (AOV) and conversion rate among new cohorts.",
      "Check payment gateway failure rates or technical checkout bugs during the period.",
      "Examine churn or subscription downgrades among existing high-tier customers.",
      "Formulate hypothesis, pull SQL cohort metrics, and present visual root-cause breakdown.",
    ],
    sampleApproach: "Use structured root-cause analysis (Funnel, Segment, Gateway, Product).",
  },
  {
    id: "iq-4",
    role: "General",
    category: "HR",
    difficulty: "Beginner",
    question: "Tell me about yourself, your academic projects, and why you are keen on starting your career in this specific role.",
    expectedKeyPoints: [
      "Crisp 90-second narrative covering education, technical interests, and hands-on projects.",
      "Demonstrating deliberate skill-building outside of classroom syllabus.",
      "Explaining why this domain excites you with a real example.",
      "Reiterating eagerness to contribute as an enthusiastic, fast-learning fresher.",
    ],
    sampleApproach: "Past (studies/origin) -> Present (projects & skills) -> Future (why this role/company).",
  },
  {
    id: "iq-5",
    role: "General",
    category: "Behavioral",
    difficulty: "Intermediate",
    question: "Describe a project or assignment where you faced a difficult roadblock or tight deadline. How did you overcome it?",
    expectedKeyPoints: [
      "Use STAR format: Situation, Task, Action, Result.",
      "Clearly articulate personal agency and proactive problem solving.",
      "Mention research, breaking down tasks, or seeking timely feedback.",
      "Quantify the final outcome or grade/result achieved.",
    ],
    sampleApproach: "Pick a technical or team hackathon/college project where you took initiative.",
  },
];

export const SAMPLE_PROFILE = DEFAULT_SAMPLE_PROFILE;
export const SAMPLE_JOB_LISTINGS = SAMPLE_JOBS;

export const SAMPLE_READINESS_ANALYSIS = {
  score: 68,
  breakdown: {
    skillsScore: 60,
    projectsScore: 70,
    educationScore: 85,
    interviewScore: 55,
    resumeScore: 65,
  },
  strengths: [
    "Proficient in Python scripting and exploratory data analysis (EDA).",
    "Hands-on experience with SQL joins and relational table queries.",
    "Strong technical degree foundation from Delhi Technological University (CGPA 8.4).",
    "Completed 2 academic and personal portfolio projects.",
  ],
  criticalSkillGaps: ["Excel (XLOOKUP, Pivot Tables)", "Power BI / Tableau", "Descriptive & Inferential Statistics"],
  recommendedSkills: ["Pandas Data Wrangling", "A/B Testing Methodologies", "Business KPI Communication"],
  improvementAreas: [
    "Master enterprise spreadsheet reporting (Pivot Tables, nested lookups).",
    "Build a real-world business dashboard utilizing Power BI or Tableau.",
    "Practice STAR-methodology answers for situational and scenario interviews.",
    "Incorporate quantifiable business impact metrics into project bullet points.",
  ],
  summary:
    "You have a solid technical bedrock in Python and core SQL queries. To be fully competitive for Tier-1 Data Analyst fresher openings, prioritize mastering Power BI dashboards and advanced Excel modeling, which will boost your readiness score past 85.",
};

export const SAMPLE_ROADMAP_STEPS = [
  {
    stepNumber: 1,
    title: "Learn Missing Core Technical Skills",
    description: "Acquire mandatory industry competencies: Excel, Power BI, and Applied Business Statistics.",
    estimatedWeeks: "Weeks 1 - 3",
    tasks: [
      { id: "t1-1", text: "Master Excel Pivot Tables, VLOOKUP/XLOOKUP, and nested IF formulas", completed: true, tag: "Excel" },
      { id: "t1-2", text: "Complete Power BI Data Modeling, Star Schemas, and basic DAX measures", completed: false, tag: "Power BI" },
      { id: "t1-3", text: "Study hypothesis testing, confidence intervals, and p-values for A/B testing", completed: false, tag: "Statistics" },
      { id: "t1-4", text: "Practice 25 intermediate SQL window functions (RANK, ROW_NUMBER, CTEs)", completed: false, tag: "SQL" },
    ],
  },
  {
    stepNumber: 2,
    title: "Build 2 Real-World Portfolio Projects",
    description: "Create end-to-end data analytics projects demonstrating business impact, published with GitHub & live dashboards.",
    estimatedWeeks: "Weeks 4 - 6",
    tasks: [
      { id: "t2-1", text: "Develop E-Commerce Customer Churn & Cohort Retention Dashboard in Power BI", completed: false, tag: "Portfolio" },
      { id: "t2-2", text: "Build an automated Python scraping & SQL sales ETL pipeline", completed: false, tag: "Python/SQL" },
      { id: "t2-3", text: "Publish GitHub repositories with detailed READMEs, architecture diagrams, and insights", completed: false, tag: "GitHub" },
    ],
  },
  {
    stepNumber: 3,
    title: "Optimize Resume with ATS Keywords & Action Verbs",
    description: "Craft a high-scoring single-page ATS resume with strong action verbs and verified keyword density.",
    estimatedWeeks: "Week 7",
    tasks: [
      { id: "t3-1", text: "Incorporate missing high-frequency keywords (Power BI, DAX, SQL Window Functions)", completed: false, tag: "ATS" },
      { id: "t3-2", text: "Rewrite all project bullet points to use the 'Action Verb + Context + Quantifiable Metric' formula", completed: false, tag: "Copywriting" },
      { id: "t3-3", text: "Run JobPlanner AI ATS scanner to verify a score of 80% or higher", completed: false, tag: "AI Audit" },
    ],
  },
  {
    stepNumber: 4,
    title: "Practice Technical & Behavioral Interviews",
    description: "Simulate live interview rounds with AI evaluation across SQL queries, case studies, and HR questions.",
    estimatedWeeks: "Weeks 8 - 9",
    tasks: [
      { id: "t4-1", text: "Complete 10 SQL query live drills on joins, aggregation, and subqueries", completed: false, tag: "Technical" },
      { id: "t4-2", text: "Practice 5 business case scenario problems (e.g. drop in revenue vs increase in signups)", completed: false, tag: "Case Study" },
      { id: "t4-3", text: "Rehearse STAR responses for behavioral questions (roadblocks, conflict, teamwork)", completed: false, tag: "HR" },
    ],
  },
  {
    stepNumber: 5,
    title: "Targeted Job Applications & Cold Outreach",
    description: "Apply to matched entry-level roles and connect directly with talent acquisition teams on LinkedIn.",
    estimatedWeeks: "Weeks 10 - 12",
    tasks: [
      { id: "t5-1", text: "Apply to 5 high-match (>70%) jobs recommended on JobPlanner weekly", completed: false, tag: "Applications" },
      { id: "t5-2", text: "Optimize LinkedIn headline and featured projects section with live portfolio links", completed: false, tag: "Networking" },
      { id: "t5-3", text: "Send 3 personalized referral request messages to alumni or hiring managers per week", completed: false, tag: "Outreach" },
    ],
  },
];

export const SAMPLE_RESUME_DATA = {
  personalInfo: {
    fullName: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91 98765 43210",
    location: "Delhi / Bengaluru, India",
    linkedin: "linkedin.com/in/rahulsharma-dev",
    github: "github.com/rahulsharma-dev",
  },
  summary:
    "Detail-oriented and analytically driven Computer Science graduate from Delhi Technological University (CGPA 8.4). Proficient in Python, SQL data querying, and exploratory data analysis. Passionate about uncovering commercial patterns and engineering automated reporting dashboards.",
  education: [
    {
      id: "edu-1",
      institution: "Delhi Technological University (DTU)",
      degree: "Bachelor of Technology (B.Tech)",
      branch: "Computer Science & Engineering",
      graduationYear: "2025",
      cgpa: "8.4 / 10.0",
    },
  ],
  skills: ["Python", "SQL", "Pandas", "NumPy", "Matplotlib", "HTML", "CSS", "Git", "Jupyter Notebooks"],
  projects: [
    {
      id: "proj-1",
      title: "Student Academic Performance EDA & Predictive Analysis",
      techStack: "Python, Pandas, Seaborn, Scikit-Learn",
      points: [
        "Analyzed multi-variable demographic and assessment records across 2,000+ student profiles using Pandas and Seaborn.",
        "Identified 4 primary indicators predicting semester exam scores with 88% correlation accuracy.",
        "Engineered automated Jupyter visualization pipelines reducing raw data exploration time by 45%.",
      ],
      link: "https://github.com/rahulsharma-dev/student-eda",
    },
    {
      id: "proj-2",
      title: "Automated Web Scraping & SQL Job Trends Pipeline",
      techStack: "Python, BeautifulSoup, SQLite, Matplotlib",
      points: [
        "Built resilient web scrapers tracking 1,500+ tech job postings across tech forums and job portals.",
        "Parsed and normalized unstructured job descriptions into structured SQLite tables for weekly trend queries.",
        "Generated visual breakdown reports highlighting the most in-demand skills for entry-level developers.",
      ],
      link: "https://github.com/rahulsharma-dev/job-trends-pipeline",
    },
  ],
  experience: [],
  certifications: [
    {
      id: "cert-1",
      title: "Python for Data Science and Machine Learning",
      issuer: "Coursera / DeepLearning.AI",
      year: "2024",
    },
    {
      id: "cert-2",
      title: "Relational Database Design and SQL Mastery",
      issuer: "HackerRank Verified",
      year: "2024",
    },
  ],
};

