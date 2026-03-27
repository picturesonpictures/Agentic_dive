import { useFlowStore } from '../store/flowStore'

const NODE_TYPES = [
  { group: 'Inputs',
    nodes: [
      { type: 'textInput',    label: '✏️ Text Input',     desc: 'Static/editable text' },
      { type: 'systemPrompt', label: '⚙️ System Prompt',  desc: 'Instructions for the model' },
    ]
  },
  { group: 'Models',
    nodes: [
      { type: 'model', label: '🤖 Model', desc: 'Calls an LLM via OpenRouter' },
      { type: 'modelRouter', label: '🧭 Router', desc: 'Pick best model for task' },
    ]
  },
  { group: 'Outputs',
    nodes: [
      { type: 'textOutput', label: '📄 Output', desc: 'Displays model response' },
    ]
  },
  { group: 'Data',
    nodes: [
      { type: 'jsonExtract', label: '🔍 JSON Extract', desc: 'Extract value by path' },
      { type: 'promptTemplate', label: '📝 Prompt Template', desc: 'Template with {{variables}}' },
      { type: 'httpRequest', label: '🌐 HTTP Request', desc: 'Fetch data from APIs' },
    ]
  },
  { group: 'Logic',
    nodes: [
      { type: 'conditional', label: '🔀 Conditional', desc: 'Route by condition' },
      { type: 'evaluator', label: '⚖️ Evaluator', desc: 'LLM quality gate (pass/fail)' },
    ]
  },
  { group: 'Code',
    nodes: [
      { type: 'codeRunner', label: '⚡ Code Runner', desc: 'Run JavaScript on input' },
    ]
  },
  { group: 'Memory',
    nodes: [
      { type: 'conversationBuffer', label: '💬 Chat Buffer', desc: 'Accumulates messages across runs' },
      { type: 'variableStore', label: '📦 Variable', desc: 'Get/set persistent variables' },
    ]
  },
  { group: 'Media',
    nodes: [
      { type: 'imageInput',  label: '🖼️ Image Input',  desc: 'Upload/paste/URL image' },
      { type: 'imageOutput', label: '🖼️ Image Output', desc: 'Display image result' },
    ]
  },
  { group: 'Composition',
    nodes: [
      { type: 'subFlow', label: '📦 Sub-Flow', desc: 'Run a saved flow as a node' },
      { type: 'loop', label: '🔄 Loop', desc: 'Iterate sub-flow with feedback' },
    ]
  },
  { group: 'Utilities',
    nodes: [
      { type: 'concat', label: '🔗 Combine Text', desc: 'Merge two text inputs' },
      { type: 'note',   label: '📝 Note',          desc: 'Annotation / comment' },
    ]
  },
]

export function NodePicker() {
  const addNode = useFlowStore(s => s.addNode)

  return (
    <aside className="w-44 bg-zinc-900 border-r border-zinc-700 flex flex-col gap-3 p-2 overflow-y-auto">
      {NODE_TYPES.map(group => (
        <div key={group.group}>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 px-1">
            {group.group}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.nodes.map(n => (
              <button
                key={n.type}
                onClick={() => addNode(n.type)}
                className="text-left rounded p-2 hover:bg-zinc-700 transition-colors"
              >
                <div className="text-xs text-zinc-100">{n.label}</div>
                <div className="text-[10px] text-zinc-500">{n.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
