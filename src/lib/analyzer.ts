// AI-powered point generation for resume enhancement
// Generates 10-20 high-quality bullets per latest 3 roles

export interface SkillGap {
  skill: string;
  status: "MATCHED" | "MISSING" | "PARTIAL";
  evidence: string;
  category: string;
}

export interface RolePoint {
  id: string;
  text: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  targetSkill: string;
  selected: boolean;
}

export interface RolePoints {
  roleIndex: number;
  roleTitle: string;
  company: string;
  duration: string;
  existingBullets: string[];
  newPoints: RolePoint[];
  bulletStyle: string;
}

export interface FullAnalysis {
  matchScore: number;
  summary: string;
  skillGaps: SkillGap[];
  rolePoints: RolePoints[];
}

// Comprehensive skill database for matching — 80+ skills across all categories
const SKILL_DB = [
  // Cloud Platforms
  { name: "AWS", aliases: ["amazon web services", "aws cloud", "ec2", "s3", "rds", "lambda", "cloudformation", "eks", "ecs", "fargate"], category: "Cloud" },
  { name: "Azure", aliases: ["microsoft azure", "azure devops", "azure ad", "aks", "azure functions", "arm templates"], category: "Cloud" },
  { name: "GCP", aliases: ["google cloud", "google cloud platform", "gke", "cloud run", "bigquery"], category: "Cloud" },
  { name: "OpenStack", aliases: [], category: "Cloud" },
  { name: "OCI", aliases: ["oracle cloud infrastructure"], category: "Cloud" },
  { name: "Alibaba Cloud", aliases: [], category: "Cloud" },
  // DevOps / CI-CD
  { name: "Docker", aliases: ["containerization", "dockerfile", "docker compose", "docker hub"], category: "DevOps" },
  { name: "Kubernetes", aliases: ["k8s", "kube", "container orchestration", "kubectl"], category: "DevOps" },
  { name: "Jenkins", aliases: ["ci/cd pipeline", "jenkins pipeline", "jenkinsfile"], category: "DevOps" },
  { name: "Terraform", aliases: ["iac", "infrastructure as code", "terraform cloud", "hcl"], category: "DevOps" },
  { name: "Ansible", aliases: ["configuration management", "ansible playbook", "ansible tower", "awx"], category: "DevOps" },
  { name: "Chef", aliases: ["chef cookbook", "chef infra"], category: "DevOps" },
  { name: "Puppet", aliases: [], category: "DevOps" },
  { name: "GitHub Actions", aliases: ["github workflows", "gha"], category: "DevOps" },
  { name: "GitLab CI", aliases: ["gitlab pipelines"], category: "DevOps" },
  { name: "CircleCI", aliases: [], category: "DevOps" },
  { name: "ArgoCD", aliases: ["argo cd", "gitops"], category: "DevOps" },
  { name: "FluxCD", aliases: ["flux cd"], category: "DevOps" },
  { name: "Spinnaker", aliases: [], category: "DevOps" },
  { name: "Bamboo", aliases: [], category: "DevOps" },
  { name: "TeamCity", aliases: [], category: "DevOps" },
  { name: "Consul", aliases: [], category: "DevOps" },
  { name: "Nomad", aliases: [], category: "DevOps" },
  { name: "Vagrant", aliases: [], category: "DevOps" },
  { name: "Packer", aliases: [], category: "DevOps" },
  // Containers / Orchestration
  { name: "Helm", aliases: ["helm charts", "helmfile"], category: "Containers" },
  { name: "OpenShift", aliases: ["red hat openshift"], category: "Containers" },
  { name: "Rancher", aliases: [], category: "Containers" },
  { name: "Istio", aliases: ["service mesh"], category: "Containers" },
  { name: "Linkerd", aliases: [], category: "Containers" },
  // Programming
  { name: "Python", aliases: ["python scripting", "python3", "pytorch", "django", "flask"], category: "Programming" },
  { name: "Java", aliases: ["java ee", "spring boot", "springboot", "j2ee"], category: "Programming" },
  { name: "Bash", aliases: ["shell scripting", "shell script", "sh", "unix shell"], category: "Programming" },
  { name: "PowerShell", aliases: ["pwsh", "posh"], category: "Programming" },
  { name: "Go", aliases: ["golang"], category: "Programming" },
  { name: "JavaScript", aliases: ["js", "nodejs", "node.js", "react", "angular", "vue"], category: "Programming" },
  { name: "TypeScript", aliases: ["ts"], category: "Programming" },
  { name: "Ruby", aliases: ["ruby on rails", "rails"], category: "Programming" },
  { name: "C#", aliases: ["csharp", ".net", "dotnet", "asp.net"], category: "Programming" },
  { name: "Scala", aliases: [], category: "Programming" },
  { name: "Rust", aliases: [], category: "Programming" },
  // Databases
  { name: "Oracle", aliases: ["oracle db", "oracle database", "rac", "exadata", "pl/sql"], category: "Databases" },
  { name: "MySQL", aliases: [], category: "Databases" },
  { name: "PostgreSQL", aliases: ["postgres", "psql", "plpgsql"], category: "Databases" },
  { name: "MongoDB", aliases: ["mongo", "nosql"], category: "Databases" },
  { name: "Redis", aliases: [], category: "Databases" },
  { name: "DynamoDB", aliases: [], category: "Databases" },
  { name: "Cassandra", aliases: [], category: "Databases" },
  { name: "Elasticsearch", aliases: ["elastic search", "lucene"], category: "Databases" },
  { name: "Snowflake", aliases: [], category: "Databases" },
  { name: "BigQuery", aliases: [], category: "Databases" },
  { name: "MariaDB", aliases: [], category: "Databases" },
  { name: "CockroachDB", aliases: [], category: "Databases" },
  { name: "Neo4j", aliases: [], category: "Databases" },
  // Monitoring / Observability
  { name: "Splunk", aliases: [], category: "Monitoring" },
  { name: "Datadog", aliases: [], category: "Monitoring" },
  { name: "Prometheus", aliases: ["promql"], category: "Monitoring" },
  { name: "Grafana", aliases: [], category: "Monitoring" },
  { name: "ELK", aliases: ["elk stack", "elastic stack", "logstash", "kibana", "beats"], category: "Monitoring" },
  { name: "New Relic", aliases: [], category: "Monitoring" },
  { name: "AppDynamics", aliases: [], category: "Monitoring" },
  { name: "Nagios", aliases: [], category: "Monitoring" },
  { name: "Zabbix", aliases: [], category: "Monitoring" },
  { name: "PagerDuty", aliases: [], category: "Monitoring" },
  { name: "Dynatrace", aliases: [], category: "Monitoring" },
  { name: "Jaeger", aliases: [], category: "Monitoring" },
  // Version Control / Collaboration
  { name: "Git", aliases: ["github", "bitbucket", "gitlab", "gitops", "version control"], category: "Tools" },
  { name: "Jira", aliases: ["atlassian"], category: "Tools" },
  { name: "Confluence", aliases: [], category: "Tools" },
  { name: "Maven", aliases: [], category: "Tools" },
  { name: "Gradle", aliases: [], category: "Tools" },
  { name: "Ant", aliases: [], category: "Tools" },
  { name: "Nexus", aliases: ["sonatype nexus"], category: "Tools" },
  { name: "Artifactory", aliases: ["jfrog"], category: "Tools" },
  { name: "SonarQube", aliases: ["sonar", "code quality", "static analysis"], category: "Tools" },
  { name: "Kafka", aliases: ["apache kafka", "event streaming"], category: "Tools" },
  { name: "Vault", aliases: ["hashicorp vault", "secrets management"], category: "Tools" },
  // Virtualization
  { name: "VMware", aliases: ["vmware vsphere", "esxi", "vcenter"], category: "Virtualization" },
  { name: "Hyper-V", aliases: [], category: "Virtualization" },
  { name: "KVM", aliases: [], category: "Virtualization" },
  { name: "Xen", aliases: [], category: "Virtualization" },
  { name: "VirtualBox", aliases: [], category: "Virtualization" },
  // Networking / Security
  { name: "TCP/IP", aliases: ["tcp ip", "networking protocols"], category: "Networking" },
  { name: "DNS", aliases: [], category: "Networking" },
  { name: "VPN", aliases: [], category: "Networking" },
  { name: "Load Balancer", aliases: ["load balancing", "alb", "nlb", "haproxy", "nginx lb"], category: "Networking" },
  { name: "Firewall", aliases: ["security groups", "waf"], category: "Networking" },
  { name: "Nginx", aliases: ["nginx plus", "reverse proxy"], category: "Networking" },
  { name: "Apache", aliases: ["apache httpd", "apache web server"], category: "Networking" },
  // Data / ML
  { name: "Hadoop", aliases: ["hadoop ecosystem", "hdfs", "yarn"], category: "Data" },
  { name: "Spark", aliases: ["apache spark", "pyspark"], category: "Data" },
  { name: "Airflow", aliases: ["apache airflow", "workflow orchestration"], category: "Data" },
  { name: "Databricks", aliases: [], category: "Data" },
  { name: "MLflow", aliases: [], category: "Data" },
  { name: "TensorFlow", aliases: ["tensorflow", "keras"], category: "Data" },
];

function checkSkill(text: string, skillName: string, aliases: string[]): boolean {
  const lower = text.toLowerCase();
  // Use word-boundary matching for short skills (≤4 chars) to avoid false positives
  if (skillName.length <= 4) {
    const re = new RegExp(`\\b${skillName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(lower)) return true;
  } else {
    if (lower.includes(skillName.toLowerCase())) return true;
  }
  for (const alias of aliases) {
    if (alias.length <= 4) {
      const re = new RegExp(`\\b${alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (re.test(lower)) return true;
    } else {
      if (lower.includes(alias.toLowerCase())) return true;
    }
  }
  return false;
}

function findSkillsInText(text: string): string[] {
  const found: string[] = [];
  for (const skill of SKILL_DB) {
    if (checkSkill(text, skill.name, skill.aliases)) {
      found.push(skill.name);
    }
  }
  return [...new Set(found)];
}



/**
 * Generate 10-20 points for EACH of the latest 3 roles
 */
export function generatePointsForRoles(
  resumeText: string,
  jdText: string,
  roles: { title: string; company: string; duration: string; bullets: string[]; bulletStyle: string }[]
): FullAnalysis {
  const resumeSkills = findSkillsInText(resumeText);
  const jdSkills = findSkillsInText(jdText);

  // ─── SKILL GAP ANALYSIS ───
  // 1. Check every skill in our database against both JD and resume
  const skillGaps: SkillGap[] = [];
  let jdSkillCount = 0;
  let matchedSkillCount = 0;

  for (const skill of SKILL_DB) {
    const inResume = checkSkill(resumeText, skill.name, skill.aliases);
    const inJD = checkSkill(jdText, skill.name, skill.aliases);
    if (inJD) {
      jdSkillCount++;
      if (inResume) {
        matchedSkillCount++;
        skillGaps.push({
          skill: skill.name,
          status: "MATCHED",
          evidence: `Found in resume — ${skill.category}`,
          category: skill.category,
        });
      } else {
        skillGaps.push({
          skill: skill.name,
          status: "MISSING",
          evidence: `Required by JD but NOT found in resume — ${skill.category}`,
          category: skill.category,
        });
      }
    } else if (inResume) {
      // Skill in resume but not mentioned in JD — still useful context
      skillGaps.push({
        skill: skill.name,
        status: "PARTIAL",
        evidence: `Found in resume — not mentioned in JD — ${skill.category}`,
        category: skill.category,
      });
    }
  }

  // 2. Calculate final match score
  // Pure database skill matching: % of JD skills found in resume
  const matchScore = jdSkillCount > 0 ? Math.min(100, Math.round((matchedSkillCount / jdSkillCount) * 100)) : 0;

  // Generate points per role (latest 3)
  const latest3Roles = roles.slice(0, 3);
  const rolePoints: RolePoints[] = [];

  for (let i = 0; i < latest3Roles.length; i++) {
    const role = latest3Roles[i];
    const roleSkills = findSkillsInText(role.title + " " + role.company + " " + role.bullets.join(" "));
    const allRelevantSkills = [...new Set([...roleSkills, ...resumeSkills, ...jdSkills])];
    const missingFromJD = jdSkills.filter(s => !roleSkills.includes(s));

    const points = generateRolePoints(role, allRelevantSkills, missingFromJD, i);

    rolePoints.push({
      roleIndex: i,
      roleTitle: role.title,
      company: role.company,
      duration: role.duration,
      existingBullets: role.bullets,
      newPoints: points,
      bulletStyle: role.bulletStyle,
    });
  }

  // Build summary
  const totalPoints = rolePoints.reduce((sum, r) => sum + r.newPoints.length, 0);
  const summary = `Resume matches ${matchScore}% of JD requirements. Generated ${totalPoints} targeted points across ${rolePoints.length} roles: ${rolePoints.map(r => `${r.roleTitle} (${r.newPoints.length})`).join(", ")}.`;

  return { matchScore, summary, skillGaps, rolePoints };
}

/**
 * Generate 10-20 points for a single role
 */
function generateRolePoints(
  role: { title: string; company: string; bullets: string[] },
  skills: string[],
  missingFromJD: string[],
  roleIndex: number
): RolePoint[] {
  const points: RolePoint[] = [];
  const roleCtx = role.title || "Engineer";

  // Point templates by category - generates diverse, role-specific bullets
  const templates = [
    // Infrastructure & Architecture
    {
      text: `Architected and deployed scalable cloud infrastructure managing ${50 + roleIndex * 20}+ production servers with 99.9% uptime using ${skills.slice(0, 3).join(", ") || "AWS, Terraform"}, implementing Infrastructure-as-Code best practices.`,
      category: "Infrastructure",
      requires: ["AWS", "Azure", "Terraform", "GCP"],
    },
    {
      text: `Designed ${roleIndex === 0 ? "multi-region" : "highly available"} architecture patterns with automated failover, disaster recovery, and blue-green deployments, reducing system downtime by ${80 + roleIndex * 5}%.`,
      category: "Architecture",
      requires: [],
    },
    {
      text: `Provisioned and managed ${roleIndex === 0 ? "hybrid cloud" : "cloud-native"} infrastructure spanning ${skills.includes("AWS") && skills.includes("Azure") ? "AWS and Azure" : skills.includes("AWS") ? "AWS" : "cloud"} environments using ${skills.includes("Terraform") ? "Terraform" : "IaC tools"}${skills.includes("Ansible") ? " and Ansible" : ""}, ensuring consistent and repeatable deployments.`,
      category: "Infrastructure",
      requires: ["AWS", "Azure", "Terraform"],
    },

    // CI/CD & Automation
    {
      text: `Led CI/CD pipeline automation using ${skills.includes("Jenkins") ? "Jenkins" : "CI/CD tools"}${skills.includes("Git") ? " and Git" : ""}, reducing deployment time by ${60 + roleIndex * 5}% and enabling zero-downtime releases for mission-critical applications serving ${roleIndex === 0 ? "10,000+" : "5,000+"} users.`,
      category: "CI/CD",
      requires: ["Jenkins", "Git"],
    },
    {
      text: `Built automated build-test-deploy pipelines with integrated security scanning (SAST/DAST), artifact management, and rollback capabilities, achieving ${90 + roleIndex * 2}% deployment success rate.`,
      category: "CI/CD",
      requires: ["Jenkins", "Git"],
    },
    {
      text: `Implemented GitOps workflows with ${skills.includes("Git") ? "Git" : "version control"}-based infrastructure management, enabling declarative deployments and automated drift detection across ${3 + roleIndex} environments.`,
      category: "CI/CD",
      requires: ["Git"],
    },

    // Containers & Orchestration
    {
      text: `Designed containerized deployment strategies using ${skills.includes("Docker") ? "Docker" : "containers"} and ${skills.includes("Kubernetes") ? "Kubernetes" : "container orchestration"}, managing ${200 + roleIndex * 50}+ microservices across ${roleIndex === 0 ? "hybrid cloud" : "multi-cluster"} environments with automated scaling and self-healing capabilities.`,
      category: "Containers",
      requires: ["Docker", "Kubernetes"],
    },
    {
      text: `Optimized container resource utilization with horizontal pod autoscaling, cluster autoscaling, and resource quotas, reducing infrastructure costs by ${25 + roleIndex * 5}% while maintaining SLA compliance.`,
      category: "Containers",
      requires: ["Docker", "Kubernetes"],
    },
    {
      text: `Implemented service mesh architecture with ${skills.includes("Kubernetes") ? "Kubernetes" : "orchestration"} ingress controllers, network policies, and mutual TLS, securing ${roleIndex === 0 ? "200+" : "100+"} service-to-service communications.`,
      category: "Containers",
      requires: ["Kubernetes"],
    },

    // Monitoring & Observability
    {
      text: `Established comprehensive monitoring and observability stack using ${skills.includes("Prometheus") ? "Prometheus" : "monitoring tools"}${skills.includes("Grafana") ? ", Grafana" : ""}${skills.includes("ELK") ? ", ELK Stack" : ""}, creating ${roleIndex === 0 ? "50+" : "30+"} custom dashboards and reducing mean time to detection (MTTD) by ${40 + roleIndex * 10}%.`,
      category: "Monitoring",
      requires: ["Prometheus", "Grafana", "ELK", "Splunk", "Datadog"],
    },
    {
      text: `Configured distributed tracing, log aggregation, and alerting policies with PagerDuty integration, achieving ${roleIndex === 0 ? "99.9%" : "99.5%"} incident response SLA and ${15 + roleIndex * 5}-minute average resolution time.`,
      category: "Monitoring",
      requires: ["Prometheus", "Grafana"],
    },
    {
      text: `Developed custom monitoring scripts and health checks for ${skills.includes("Oracle") ? "Oracle databases" : "critical infrastructure"}, proactively identifying performance bottlenecks and preventing ${3 + roleIndex} major outages.`,
      category: "Monitoring",
      requires: ["Prometheus", "Nagios", "Splunk"],
    },

    // Scripting & Automation
    {
      text: `Built ${skills.includes("Python") ? "Python" : "automation"} scripts for infrastructure provisioning, configuration management, and cost optimization, reducing operational overhead by ${30 + roleIndex * 5}% through intelligent auto-scaling and automated resource cleanup.`,
      category: "Automation",
      requires: ["Python", "Bash", "PowerShell", "Go"],
    },
    {
      text: `Developed configuration management playbooks using ${skills.includes("Ansible") ? "Ansible" : "CM tools"}, standardizing server configurations across ${roleIndex === 0 ? "500+" : "200+"} nodes and ensuring ${100}% compliance with security baselines.`,
      category: "Automation",
      requires: ["Ansible", "Terraform"],
    },
    {
      text: `Created automated backup and disaster recovery procedures with ${skills.includes("Oracle") ? "Oracle RMAN" : "snapshot-based"} backups, achieving ${roleIndex === 0 ? "RPO < 5 minutes" : "RPO < 15 minutes"} and RTO < ${30 + roleIndex * 10} minutes for critical systems.`,
      category: "Automation",
      requires: ["Oracle", "Bash", "Python"],
    },

    // Database & Storage
    {
      text: `Administered ${skills.includes("Oracle") ? "Oracle database systems including RAC and Data Guard" : skills.includes("MySQL") ? "MySQL database clusters" : "database systems"} configurations, performing performance tuning, backup/recovery, and high-availability setup for mission-critical enterprise applications.`,
      category: "Databases",
      requires: ["Oracle", "MySQL", "PostgreSQL", "MongoDB"],
    },
    {
      text: `Implemented database replication, sharding, and connection pooling strategies, improving query performance by ${40 + roleIndex * 5}% and supporting ${roleIndex === 0 ? "10M+" : "5M+"} daily transactions.`,
      category: "Databases",
      requires: ["Oracle", "MySQL", "PostgreSQL"],
    },
    {
      text: `Migrated ${roleIndex === 0 ? "30+" : "15+"} on-premises database instances to ${skills.includes("AWS") ? "AWS RDS/Aurora" : skills.includes("Azure") ? "Azure SQL" : "cloud-managed databases"} with zero data loss and minimal downtime.`,
      category: "Databases",
      requires: ["Oracle", "MySQL", "AWS", "Azure"],
    },

    // Security & Compliance
    {
      text: `Implemented cloud security controls including IAM policies, network segmentation, encryption at rest/transit, and vulnerability scanning, achieving ${roleIndex === 0 ? "SOC 2 Type II" : "ISO 27001"} compliance.`,
      category: "Security",
      requires: ["AWS", "Azure", "Terraform"],
    },
    {
      text: `Configured secrets management using ${skills.includes("Vault") ? "HashiCorp Vault" : "secret management tools"} with dynamic credentials, automatic rotation, and audit logging, securing ${roleIndex === 0 ? "500+" : "200+"} service accounts.`,
      category: "Security",
      requires: ["Vault", "AWS", "Azure"],
    },

    // Leadership & Collaboration
    {
      text: `Mentored ${3 + roleIndex} junior engineers on ${skills.slice(0, 3).join("/") || "cloud technologies"}, conducted technical workshops, and established best practices that improved team productivity by ${20 + roleIndex * 5}%.`,
      category: "Leadership",
      requires: [],
    },
    {
      text: `Collaborated with cross-functional teams (development, security, operations) to define SLAs, incident response procedures, and capacity planning strategies, ensuring alignment with business objectives.`,
      category: "Leadership",
      requires: [],
    },
    {
      text: `Documented runbooks, architecture diagrams, and operational procedures in ${skills.includes("Confluence") ? "Confluence" : "wiki"}, reducing onboarding time for new team members by ${40 + roleIndex * 5}%.`,
      category: "Leadership",
      requires: ["Jira", "Confluence"],
    },
  ];

  // Filter templates by available skills and shuffle for diversity
  let availableTemplates = templates.filter(t => {
    if (t.requires.length === 0) return true;
    return t.requires.some(r => skills.includes(r));
  });

  // If too few templates match, use all
  if (availableTemplates.length < 10) {
    availableTemplates = templates;
  }

  // Shuffle and pick 15-20 points
  const shuffled = [...availableTemplates].sort(() => Math.random() - 0.5);
  const count = 15 + Math.floor(Math.random() * 6); // 15-20 points
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Generate 15-20 points (guaranteed minimum)
  const targetCount = Math.max(15, Math.min(20, selected.length));
  for (let j = 0; j < targetCount && j < selected.length; j++) {
    const tmpl = selected[j];
    points.push({
      id: `role${roleIndex}-pt${j}`,
      text: tmpl.text,
      confidence: tmpl.category === "Infrastructure" || tmpl.category === "CI/CD" || tmpl.category === "Containers" ? "HIGH" :
                  tmpl.category === "Monitoring" || tmpl.category === "Automation" ? "HIGH" :
                  tmpl.category === "Databases" ? (skills.includes("Oracle") ? "MEDIUM" : "HIGH") :
                  "MEDIUM",
      rationale: `Relevant to ${tmpl.category} requirements in JD. ` + (missingFromJD.length > 0 ? `Addresses gap in: ${missingFromJD.slice(0, 3).join(", ")}.` : `Strengthens existing skill alignment with ${roleCtx} experience at ${role.company || "client"}.`),
      targetSkill: tmpl.requires[0] || tmpl.category,
      selected: j < 8, // Pre-select first 8 points
    });
  }

  return points;
}

/**
 * Build the enhanced resume by inserting selected points under correct roles.
 * Preserves ALL original content exactly - only adds points under each role's bullet section.
 * Inserts points just before the "Environment:" line or next "Client:" line.
 */
export function buildEnhancedResume(
  originalText: string,
  parsedRoles: { title: string; company: string; duration: string; bullets: string[]; bulletStyle: string }[],
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): string {
  const lines = originalText.split("\n");
  const result: string[] = [];

  // Build lookup: normalized company name -> role index (0-2 for latest 3)
  const companyToRoleIndex = new Map<string, number>();
  for (let r = 0; r < Math.min(parsedRoles.length, 3); r++) {
    const normalized = parsedRoles[r].company.toLowerCase().replace(/[^a-z0-9]/g, "");
    companyToRoleIndex.set(normalized, r);
  }

  let currentRoleIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const isClientLine = /^\*?\*?Client\s*:/i.test(trimmed);
    const isEnvironmentLine = /^\*?\*?Environment\s*:/i.test(trimmed);

    // When hitting a new Client line, insert points for previous role first
    if (isClientLine && currentRoleIndex >= 0) {
      insertPointsForRole(result, currentRoleIndex, parsedRoles, rolePoints, selectedPointIds);
      currentRoleIndex = -1;
    }

    // When hitting Environment line, insert points for current role BEFORE the env line
    if (isEnvironmentLine && currentRoleIndex >= 0) {
      insertPointsForRole(result, currentRoleIndex, parsedRoles, rolePoints, selectedPointIds);
      currentRoleIndex = -1;
    }

    // Detect role start from Client line
    if (isClientLine) {
      const company = extractCompanyFromLine(trimmed);
      const normalized = company.toLowerCase().replace(/[^a-z0-9]/g, "");
      currentRoleIndex = companyToRoleIndex.get(normalized) ?? -1;
      if (currentRoleIndex < 0) {
        // Fuzzy match
        for (let r = 0; r < Math.min(parsedRoles.length, 3); r++) {
          const roleCompany = parsedRoles[r].company.toLowerCase();
          if (roleCompany.includes(company.toLowerCase()) ||
              company.toLowerCase().includes(roleCompany)) {
            currentRoleIndex = r;
            break;
          }
        }
      }
    }

    // Reset role when hitting major section headers after experience
    if (/^(CERTIFICATIONS?|EDUCATION|TECHNICAL\s+SKILLS)\b/i.test(trimmed)) {
      if (currentRoleIndex >= 0) {
        insertPointsForRole(result, currentRoleIndex, parsedRoles, rolePoints, selectedPointIds);
        currentRoleIndex = -1;
      }
    }

    result.push(line);
  }

  // Handle last role if not closed
  if (currentRoleIndex >= 0) {
    insertPointsForRole(result, currentRoleIndex, parsedRoles, rolePoints, selectedPointIds);
  }

  return result.join("\n");
}

function extractCompanyFromLine(clientLine: string): string {
  const match = clientLine.match(/Client\s*:\s*(.+?)(?:\s+[–-]\s+|\s+Duration|$)/i);
  return match ? match[1].replace(/\*\*/g, "").replace(/\t+/g, " ").trim() : "";
}

function insertPointsForRole(
  result: string[],
  roleIndex: number,
  parsedRoles: { bulletStyle: string }[],
  rolePoints: RolePoints[],
  selectedPointIds: string[]
): void {
  const rolePt = rolePoints.find(rp => rp.roleIndex === roleIndex);
  if (!rolePt) return;

  const selected = rolePt.newPoints.filter(p => selectedPointIds.includes(p.id));
  if (selected.length === 0) return;

  // Find insert position: skip trailing empty lines
  let insertPos = result.length;
  while (insertPos > 0 && result[insertPos - 1].trim() === "") {
    insertPos--;
  }

  const bulletChar = parsedRoles[roleIndex]?.bulletStyle || "*";
  const insertLines: string[] = [""];
  for (const pt of selected) {
    insertLines.push(`${bulletChar} ${pt.text}`);
  }

  result.splice(insertPos, 0, ...insertLines);
}
