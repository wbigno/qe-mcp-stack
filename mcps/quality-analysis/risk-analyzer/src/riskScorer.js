import axios from 'axios';
import path from 'path';
import fs from 'fs';

export class RiskScorer {
  constructor() {
    this.weights = {
      complexity: 0.20,
      coverage: 0.15,
      integration: 0.25,
      changeFrequency: 0.10,
      businessImpact: 0.20,
      defectHistory: 0.10
    };
  }

  async calculateRisk(app, story) {
    console.log(`Calculating risk for story ${story.id} in app ${app}`);

    const factors = {
      complexity: await this.analyzeComplexity(app, story),
      coverage: await this.analyzeCoverage(app, story),
      integration: await this.analyzeIntegrationRisk(app, story),
      changeFrequency: await this.analyzeChangeFrequency(app, story),
      businessImpact: await this.analyzeBusinessImpact(app, story),
      defectHistory: await this.analyzeDefectHistory(app, story)
    };

    const totalScore = Object.keys(factors).reduce((sum, key) => {
      return sum + (factors[key].score * this.weights[key]);
    }, 0);

    return {
      score: Math.round(totalScore),
      level: this.getRiskLevel(totalScore),
      factors,
      weights: this.weights,
      recommendations: this.generateRecommendations(factors, totalScore)
    };
  }

  getRiskLevel(score) {
    if (score >= 100) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  async analyzeComplexity(app, story) {
    try {
      // Extract file paths from story if available
      const affectedFiles = this.extractAffectedFiles(story);

      if (affectedFiles.length === 0) {
        return {
          score: 50,
          details: {
            totalComplexity: 0,
            fileCount: 0,
            avgComplexity: 0,
            highComplexityFiles: []
          },
          description: 'No affected files specified - moderate risk assumed'
        };
      }

      // Call dotnet-code-analyzer to get complexity metrics
      try {
        const response = await axios.post('http://dotnet-code-analyzer:3001/analyze', {
          app,
          includeTests: true
        }, { timeout: 10000 });

        const codeStructure = response.data;

        // Calculate complexity for affected files
        let totalComplexity = 0;
        let fileCount = 0;
        const highComplexityFiles = [];

        if (codeStructure.result && codeStructure.result.findings) {
          codeStructure.result.findings.forEach(finding => {
            // Check if this file is in affected files
            const isAffected = affectedFiles.some(af =>
              finding.file.includes(af) || af.includes(path.basename(finding.file))
            );

            if (isAffected) {
              const complexity = finding.metrics?.complexity || 0;
              totalComplexity += complexity;
              fileCount++;

              if (complexity > 15) {
                highComplexityFiles.push({
                  file: finding.file,
                  complexity
                });
              }
            }
          });
        }

        const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;

        // Calculate score: higher complexity = higher risk
        const score = Math.min(100, avgComplexity * 5);

        return {
          score: Math.round(score),
          details: {
            totalComplexity,
            fileCount,
            avgComplexity: Math.round(avgComplexity),
            highComplexityFiles
          },
          description: avgComplexity > 15 ? 'High code complexity detected' :
                       avgComplexity > 10 ? 'Moderate code complexity' :
                       'Low code complexity'
        };

      } catch (error) {
        console.error('Code analyzer error:', error.message);
        return {
          score: 50,
          details: { error: 'Code analyzer unavailable' },
          description: 'Could not analyze complexity - moderate risk assumed'
        };
      }

    } catch (error) {
      console.error('Complexity analysis error:', error);
      return {
        score: 50,
        details: {},
        description: 'Error analyzing complexity - moderate risk assumed'
      };
    }
  }

  async analyzeCoverage(app, story) {
    try {
      // Call coverage analyzer MCP
      const response = await axios.post('http://dotnet-coverage-analyzer:3002/analyze', {
        app,
        detailed: false
      }, { timeout: 10000 });

      const coverageData = response.data;
      const avgCoverage = coverageData.result?.overallCoverage || 0;

      // Lower coverage = higher risk (invert score)
      const riskScore = 100 - avgCoverage;

      return {
        score: Math.round(riskScore),
        details: {
          overallCoverage: Math.round(avgCoverage),
          uncoveredFiles: coverageData.result?.uncoveredFiles?.length || 0
        },
        description: avgCoverage < 30 ? 'Very low test coverage - high risk' :
                     avgCoverage < 50 ? 'Low test coverage' :
                     avgCoverage < 70 ? 'Adequate test coverage' :
                     'Good test coverage'
      };

    } catch (error) {
      console.error('Coverage analyzer error:', error.message);
      return {
        score: 70,
        details: { error: 'Coverage analyzer unavailable' },
        description: 'Coverage data unavailable - high risk assumed'
      };
    }
  }

  async analyzeIntegrationRisk(app, story) {
    try {
      // Call integration mapper MCP
      const response = await axios.post('http://integration-mapper:3008/map-integrations', {
        app,
        integrationType: 'all',
        includeDiagram: false
      }, { timeout: 10000 });

      const integrations = response.data;
      const integrationCount = integrations.result?.summary?.total || 0;

      const byType = integrations.result?.summary?.byType || {};
      const criticalIntegrations = (byType.epic || 0) + (byType.financial || 0);

      // More integrations = higher risk
      const baseScore = Math.min(50, integrationCount * 3);
      const criticalBonus = criticalIntegrations * 15;

      return {
        score: Math.min(100, baseScore + criticalBonus),
        details: {
          integrationCount,
          criticalIntegrations,
          integrationsByType: byType
        },
        description: criticalIntegrations > 3 ? 'Multiple critical integrations affected' :
                     criticalIntegrations > 0 ? 'Critical integrations affected' :
                     integrationCount > 10 ? 'Many integrations affected' :
                     integrationCount > 5 ? 'Several integrations affected' :
                     'Few integrations affected'
      };

    } catch (error) {
      console.error('Integration mapper error:', error.message);
      return {
        score: 30,
        details: { error: 'Integration mapper unavailable' },
        description: 'Integration analysis unavailable - moderate risk assumed'
      };
    }
  }

  async analyzeChangeFrequency(app, story) {
    // Simplified implementation - in production would query git history
    // For now, return moderate risk based on story complexity indicators

    const description = story.description || '';
    const acceptanceCriteria = story.acceptanceCriteria || '';
    const combined = (description + acceptanceCriteria).toLowerCase();

    // Simple heuristic: look for keywords indicating complexity
    let score = 30; // baseline

    if (combined.includes('refactor') || combined.includes('redesign')) {
      score += 20;
    }
    if (combined.includes('legacy') || combined.includes('old code')) {
      score += 15;
    }
    if (combined.includes('migration') || combined.includes('upgrade')) {
      score += 15;
    }

    return {
      score: Math.min(100, score),
      details: {
        indicators: {
          refactor: combined.includes('refactor'),
          legacy: combined.includes('legacy'),
          migration: combined.includes('migration')
        }
      },
      description: score > 60 ? 'High-churn area' :
                   score > 40 ? 'Moderate change frequency' :
                   'Stable area'
    };
  }

  async analyzeBusinessImpact(app, story) {
    try {
      // Use AI to assess business impact from story description
      const { generateCompletion } = await import('../../shared/aiClient.js');

      const storyText = `
Title: ${story.title}
Description: ${story.description || 'No description'}
Acceptance Criteria: ${story.acceptanceCriteria || 'No criteria'}
      `.trim();

      const response = await generateCompletion({
        model: process.env.DEFAULT_FAST_MODEL || 'claude-haiku-4-20250610',
        messages: [{
          role: 'user',
          content: `You are a software risk analyst. Analyze the business impact of this user story and rate it from 0-100 where:
- 0-20: Minimal impact (internal tooling, minor UI tweaks)
- 21-40: Low impact (single feature, limited user exposure)
- 41-60: Moderate impact (core feature, affects many users)
- 61-80: High impact (critical system, revenue-affecting)
- 81-100: Critical impact (customer-facing, security, compliance, revenue)

Story:
${storyText}

Respond ONLY with valid JSON in this format:
{
  "score": <number 0-100>,
  "reasoning": "<brief 1-sentence explanation>",
  "impactAreas": ["<area1>", "<area2>"]
}

Do not include any text before or after the JSON.`
        }],
        maxTokens: 300,
        temperature: 0.3
      });

      // Parse AI response
      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        score: Math.min(100, Math.max(0, analysis.score)),
        details: {
          impactAreas: analysis.impactAreas || [],
          aiReasoning: analysis.reasoning
        },
        description: analysis.reasoning
      };

    } catch (error) {
      console.error('Business impact AI analysis error:', error.message);

      // Fallback: simple keyword-based scoring
      const combined = ((story.title || '') + (story.description || '') + (story.acceptanceCriteria || '')).toLowerCase();

      let score = 50; // default moderate impact

      if (combined.includes('security') || combined.includes('compliance')) score = 90;
      else if (combined.includes('payment') || combined.includes('billing')) score = 85;
      else if (combined.includes('customer') || combined.includes('user-facing')) score = 70;
      else if (combined.includes('critical') || combined.includes('production')) score = 75;
      else if (combined.includes('internal') || combined.includes('admin')) score = 30;

      return {
        score,
        details: { fallback: true },
        description: 'Business impact estimated from keywords (AI unavailable)'
      };
    }
  }

  async analyzeDefectHistory(app, story) {
    // Simplified implementation - would query ADO for linked defects
    // For now, check story description for defect-related keywords

    const combined = ((story.title || '') + (story.description || '')).toLowerCase();

    let score = 20; // baseline low risk

    if (combined.includes('bug') || combined.includes('defect') || combined.includes('issue')) {
      score += 30;
    }
    if (combined.includes('fix') || combined.includes('hotfix')) {
      score += 20;
    }
    if (combined.includes('regression') || combined.includes('broken')) {
      score += 25;
    }

    return {
      score: Math.min(100, score),
      details: {
        keywords: {
          hasBugKeywords: combined.includes('bug') || combined.includes('defect'),
          isFixRelated: combined.includes('fix'),
          isRegressionRelated: combined.includes('regression')
        }
      },
      description: score > 60 ? 'History of defects in this area' :
                   score > 40 ? 'Some defect history' :
                   'Stable area with few defects'
    };
  }

  generateRecommendations(factors, totalScore) {
    const recommendations = [];

    // Complexity recommendations
    if (factors.complexity.score > 70) {
      recommendations.push({
        priority: 'high',
        category: 'code-review',
        text: 'Require senior developer code review due to high code complexity'
      });
    }

    // Coverage recommendations
    if (factors.coverage.score > 70) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        text: 'Add comprehensive unit tests before deployment - current coverage is low'
      });
    } else if (factors.coverage.score > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'testing',
        text: 'Increase test coverage for affected components'
      });
    }

    // Integration recommendations
    if (factors.integration.score > 70) {
      recommendations.push({
        priority: 'critical',
        category: 'testing',
        text: 'Perform full integration testing with external systems (Epic/Financial APIs)'
      });
      recommendations.push({
        priority: 'high',
        category: 'monitoring',
        text: 'Set up enhanced monitoring for integration points during deployment'
      });
    } else if (factors.integration.score > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'testing',
        text: 'Test integration points with mock services before production'
      });
    }

    // Business impact recommendations
    if (factors.businessImpact.score > 80) {
      recommendations.push({
        priority: 'critical',
        category: 'deployment',
        text: 'Deploy during maintenance window with stakeholder notification'
      });
      recommendations.push({
        priority: 'critical',
        category: 'rollback',
        text: 'Prepare rollback plan and test rollback procedure'
      });
    } else if (factors.businessImpact.score > 60) {
      recommendations.push({
        priority: 'high',
        category: 'deployment',
        text: 'Deploy outside peak hours with careful monitoring'
      });
    }

    // Overall risk recommendations
    if (totalScore >= 100) {
      recommendations.push({
        priority: 'critical',
        category: 'approval',
        text: 'Require stakeholder approval before deployment'
      });
    } else if (totalScore >= 80) {
      recommendations.push({
        priority: 'high',
        category: 'qa',
        text: 'Full QA regression testing required before release'
      });
    }

    // Defect history recommendations
    if (factors.defectHistory.score > 60) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        text: 'Extra attention needed - this area has history of defects'
      });
    }

    // Change frequency recommendations
    if (factors.changeFrequency.score > 60) {
      recommendations.push({
        priority: 'medium',
        category: 'documentation',
        text: 'Update documentation - this is a frequently modified area'
      });
    }

    return recommendations;
  }

  extractAffectedFiles(story) {
    // Try to extract file paths from story description or acceptance criteria
    const combined = (story.description || '') + '\n' + (story.acceptanceCriteria || '');

    // Look for common file path patterns
    const filePatterns = [
      /([A-Z][a-zA-Z0-9]*\/)+[A-Z][a-zA-Z0-9]*\.cs/g,  // C# files
      /Services\/[A-Z][a-zA-Z0-9]*\.cs/g,               // Services
      /Controllers\/[A-Z][a-zA-Z0-9]*\.cs/g,            // Controllers
      /Models\/[A-Z][a-zA-Z0-9]*\.cs/g                  // Models
    ];

    const files = [];
    filePatterns.forEach(pattern => {
      const matches = combined.match(pattern);
      if (matches) {
        files.push(...matches);
      }
    });

    return [...new Set(files)]; // Remove duplicates
  }
}
