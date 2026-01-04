/**
 * State Machine Analyzer
 * 
 * Static analysis of state machines and workflows
 */

/**
 * Analyze state machine from source code
 */
export async function analyzeStateMachine(params) {
  const { app, sourceCode, entityName } = params;

  validateInput(params);

  // Extract states
  const states = extractStates(sourceCode);

  // Extract transitions
  const transitions = extractTransitions(sourceCode, states);

  // Build state graph
  const graph = buildStateGraph(states, transitions);

  // Analyze paths
  const paths = analyzePaths(graph);

  // Detect issues
  const issues = detectIssues(graph, paths);

  // Generate recommendations
  const recommendations = generateRecommendations(issues);

  return {
    entity: entityName || 'Unknown',
    states,
    transitions,
    graph,
    paths,
    issues,
    recommendations,
    metadata: {
      app,
      analyzedAt: new Date().toISOString(),
      version: '1.0.0',
      stateCount: states.length,
      transitionCount: transitions.length
    }
  };
}

/**
 * Validate input
 */
function validateInput(params) {
  const { app, sourceCode } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!sourceCode || typeof sourceCode !== 'string') {
    throw new Error('sourceCode must be a string');
  }
}

/**
 * Extract states from code
 */
function extractStates(sourceCode) {
  const states = [];

  // Pattern 1: Enum-based states
  const enumPattern = /enum\s+\w*Status\w*\s*{([^}]+)}/gi;
  let match;
  while ((match = enumPattern.exec(sourceCode)) !== null) {
    const enumBody = match[1];
    const statePattern = /(\w+)\s*[,=]/g;
    let stateMatch;
    while ((stateMatch = statePattern.exec(enumBody)) !== null) {
      const stateName = stateMatch[1].trim();
      if (stateName && !states.find(s => s.name === stateName)) {
        states.push({
          name: stateName,
          type: 'enum',
          terminal: isTerminalState(stateName)
        });
      }
    }
  }

  // Pattern 2: Const/string-based states
  const constPattern = /(?:const|public\s+const)\s+string\s+(\w+)\s*=\s*["'](\w+)["']/gi;
  while ((match = constPattern.exec(sourceCode)) !== null) {
    const stateName = match[2] || match[1];
    if (!states.find(s => s.name === stateName)) {
      states.push({
        name: stateName,
        type: 'const',
        terminal: isTerminalState(stateName)
      });
    }
  }

  // Pattern 3: Switch case states
  const switchPattern = /case\s+["']?(\w+)["']?\s*:/gi;
  while ((match = switchPattern.exec(sourceCode)) !== null) {
    const stateName = match[1];
    if (!states.find(s => s.name === stateName)) {
      states.push({
        name: stateName,
        type: 'switch',
        terminal: isTerminalState(stateName)
      });
    }
  }

  return states;
}

/**
 * Check if state is terminal
 */
function isTerminalState(stateName) {
  const terminalPatterns = [
    /complete/i,
    /completed/i,
    /done/i,
    /finished/i,
    /cancelled/i,
    /rejected/i,
    /failed/i,
    /closed/i
  ];

  return terminalPatterns.some(pattern => pattern.test(stateName));
}

/**
 * Extract transitions from code
 */
function extractTransitions(sourceCode, states) {
  const transitions = [];

  // Pattern 1: Direct assignments (status = NewStatus)
  const assignPattern = /(\w+)\s*=\s*(\w+Status|\w+State)/gi;
  let match;
  while ((match = assignPattern.exec(sourceCode)) !== null) {
    const toState = match[2];
    if (states.find(s => s.name === toState)) {
      // Try to find from state context
      const fromState = findContextState(sourceCode, match.index);
      if (fromState) {
        transitions.push({
          from: fromState,
          to: toState,
          type: 'assignment'
        });
      }
    }
  }

  // Pattern 2: If-based transitions
  const ifPattern = /if\s*\(([^)]+)\)\s*{[^}]*?(\w+)\s*=\s*(\w+)/gi;
  while ((match = ifPattern.exec(sourceCode)) !== null) {
    const condition = match[1];
    const toState = match[3];
    if (states.find(s => s.name === toState)) {
      transitions.push({
        from: extractStateFromCondition(condition),
        to: toState,
        condition: condition,
        type: 'conditional'
      });
    }
  }

  // Pattern 3: Switch-based transitions
  const switchBlockPattern = /switch\s*\([^)]*?(\w+)[^)]*?\)\s*{([^}]+?)}/gi;
  while ((match = switchBlockPattern.exec(sourceCode)) !== null) {
    const switchVar = match[1];
    const switchBody = match[2];
    
    const casePattern = /case\s+["']?(\w+)["']?\s*:([^:]*?)(?=case|default|break|$)/gi;
    let caseMatch;
    while ((caseMatch = casePattern.exec(switchBody)) !== null) {
      const fromState = caseMatch[1];
      const caseBody = caseMatch[2];
      
      // Look for state assignments in case body
      const assignInCase = /(\w+)\s*=\s*(\w+)/g;
      let assignMatch;
      while ((assignMatch = assignInCase.exec(caseBody)) !== null) {
        const toState = assignMatch[2];
        if (states.find(s => s.name === fromState) && states.find(s => s.name === toState)) {
          transitions.push({
            from: fromState,
            to: toState,
            type: 'switch'
          });
        }
      }
    }
  }

  return transitions;
}

/**
 * Find state from context
 */
function findContextState(sourceCode, position) {
  const before = sourceCode.substring(Math.max(0, position - 200), position);
  const stateMatch = /(\w+Status|\w+State)\s*==\s*["']?(\w+)["']?/i.exec(before);
  return stateMatch ? stateMatch[2] : null;
}

/**
 * Extract state from condition
 */
function extractStateFromCondition(condition) {
  const match = /(\w+)\s*==\s*["']?(\w+)["']?/.exec(condition);
  return match ? match[2] : 'Unknown';
}

/**
 * Build state graph
 */
function buildStateGraph(states, transitions) {
  const graph = {
    nodes: states.map(s => ({ id: s.name, label: s.name, terminal: s.terminal })),
    edges: transitions.map((t, idx) => ({
      id: `edge-${idx}`,
      from: t.from,
      to: t.to,
      label: t.condition || ''
    }))
  };

  // Add reachability info
  graph.nodes.forEach(node => {
    node.reachableFrom = transitions.filter(t => t.to === node.id).map(t => t.from);
    node.reachesTo = transitions.filter(t => t.from === node.id).map(t => t.to);
  });

  return graph;
}

/**
 * Analyze paths through state machine
 */
function analyzePaths(graph) {
  const paths = {
    complete: [],
    incomplete: [],
    circular: []
  };

  // Find initial states (no incoming edges)
  const initialStates = graph.nodes.filter(n => n.reachableFrom.length === 0);

  // Find paths from each initial state
  initialStates.forEach(initial => {
    const visited = new Set();
    findPathsFromNode(initial.id, graph, [], visited, paths);
  });

  return paths;
}

/**
 * Find paths from a node
 */
function findPathsFromNode(nodeId, graph, currentPath, visited, paths) {
  if (visited.has(nodeId)) {
    // Circular path detected
    paths.circular.push([...currentPath, nodeId]);
    return;
  }

  visited.add(nodeId);
  currentPath.push(nodeId);

  const node = graph.nodes.find(n => n.id === nodeId);
  
  if (!node) {
    return;
  }

  // Check if terminal node
  if (node.terminal || node.reachesTo.length === 0) {
    if (node.terminal) {
      paths.complete.push([...currentPath]);
    } else {
      paths.incomplete.push([...currentPath]);
    }
    currentPath.pop();
    visited.delete(nodeId);
    return;
  }

  // Continue to next states
  node.reachesTo.forEach(nextId => {
    findPathsFromNode(nextId, graph, currentPath, new Set(visited), paths);
  });

  currentPath.pop();
  visited.delete(nodeId);
}

/**
 * Detect issues in state machine
 */
function detectIssues(graph, paths) {
  const issues = [];

  // Issue 1: Unreachable states
  const unreachableStates = graph.nodes.filter(n => 
    n.reachableFrom.length === 0 && n.reachesTo.length > 0
  );
  if (unreachableStates.length > 0) {
    issues.push({
      type: 'unreachable-states',
      severity: 'medium',
      states: unreachableStates.map(s => s.id),
      description: 'States that cannot be reached from any other state'
    });
  }

  // Issue 2: Dead-end states (non-terminal with no outgoing transitions)
  const deadEndStates = graph.nodes.filter(n => 
    !n.terminal && n.reachesTo.length === 0 && n.reachableFrom.length > 0
  );
  if (deadEndStates.length > 0) {
    issues.push({
      type: 'dead-end-states',
      severity: 'high',
      states: deadEndStates.map(s => s.id),
      description: 'Non-terminal states with no outgoing transitions'
    });
  }

  // Issue 3: Circular paths
  if (paths.circular.length > 0) {
    issues.push({
      type: 'circular-paths',
      severity: 'low',
      paths: paths.circular,
      description: 'Circular state transitions detected'
    });
  }

  // Issue 4: No terminal states
  const terminalStates = graph.nodes.filter(n => n.terminal);
  if (terminalStates.length === 0) {
    issues.push({
      type: 'no-terminal-states',
      severity: 'high',
      description: 'State machine has no terminal states'
    });
  }

  return issues;
}

/**
 * Generate recommendations
 */
function generateRecommendations(issues) {
  const recommendations = [];

  issues.forEach(issue => {
    switch (issue.type) {
      case 'unreachable-states':
        recommendations.push({
          priority: 'medium',
          category: 'design',
          action: `Add transitions to reach states: ${issue.states.join(', ')}`,
          reason: 'Unreachable states indicate missing transitions or unused states'
        });
        break;

      case 'dead-end-states':
        recommendations.push({
          priority: 'high',
          category: 'bug',
          action: `Add terminal flag or transitions from: ${issue.states.join(', ')}`,
          reason: 'States with no exit path can trap workflows'
        });
        break;

      case 'circular-paths':
        recommendations.push({
          priority: 'low',
          category: 'review',
          action: 'Review circular transitions for correctness',
          reason: 'Circular paths may be intentional but should be verified'
        });
        break;

      case 'no-terminal-states':
        recommendations.push({
          priority: 'high',
          category: 'design',
          action: 'Define terminal states (Completed, Cancelled, etc.)',
          reason: 'Terminal states are needed to properly conclude workflows'
        });
        break;
    }
  });

  return recommendations;
}

export default {
  analyzeStateMachine
};
