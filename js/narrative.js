// ===== NARRATIVE.JS - Story Beats, Dialogue Trees & Endings =====

const Narrative = (() => {
  // Story flags tracked across the run
  const FLAGS = {
    TRUST_CLIENT: 'trust_client',
    QUESTION_CLIENT: 'question_client',
    NOTICED_INSIDER: 'noticed_insider',
    IGNORED_INSIDER: 'ignored_insider',
    INVESTIGATED: 'investigated',
    LOOKED_AWAY: 'looked_away',
    LOYAL: 'loyal',
    REBEL: 'rebel',
  };

  // Story beats indexed by shift number (shown BEFORE the shift starts)
  const STORY_BEATS = {
    1: {
      sender: 'FROM: Management <ops@meridian-corp.net>',
      text: `Welcome to Meridian Security Corp, operator.\n\nYour assignment: overnight surveillance of the Hargrove Collection vault, sublevel B.\n\nThe collection contains a single item — the Koh-i-Sera diamond. Estimated value: classified.\n\nMonitor all camera feeds. Lock doors to slow intruders. Trigger alarms when threats are detected.\n\nDo not leave your station. Do not contact local authorities. All incidents are handled internally.\n\nGood luck on your first shift.`,
      choices: [
        { text: '> Understood. Ready for duty.', flag: FLAGS.LOYAL },
        { text: '> "Handled internally"? That seems unusual.', flag: FLAGS.QUESTION_CLIENT },
      ],
    },
    2: {
      sender: 'FROM: D. Chen <d.chen@meridian-corp.net>',
      text: `Hey, new operator. I'm Chen — I had the shift before you.\n\nJust a heads up: the break-in patterns are getting weird. Last week they hit at exactly 2:47 AM, three nights in a row. Same entry point each time.\n\nAlmost like they knew the camera rotation schedule.\n\nProbably nothing. But keep your eyes open.\n\nAlso — don't bother asking management about it. They told me to "focus on my station."\n\n- Chen`,
      choices: [
        { text: '> Thanks for the warning. I\'ll watch for patterns.', flag: FLAGS.NOTICED_INSIDER },
        { text: '> Sounds like you\'re overthinking it. I\'ll handle my shift.', flag: FLAGS.IGNORED_INSIDER },
      ],
    },
    3: {
      sender: 'FROM: UNKNOWN <encrypted-relay>',
      text: `Operator,\n\nI know you can see the feeds. I know what they're not showing you.\n\nThe diamond in that vault? It was stolen from the National Museum of Karesha six months ago. Meridian "acquired" it through a shell company. The heists aren't random — they're recovery attempts by the original owners.\n\nYou're not protecting a jewel. You're guarding stolen property for a corporation.\n\nI can prove it. But I need you to leave camera 3 uncovered during the next shift. Just for one room. That's all.\n\nYour call.`,
      choices: [
        { text: '> I need to see this proof. Tell me more.', flag: FLAGS.INVESTIGATED },
        { text: '> Nice try. I\'m doing my job.', flag: FLAGS.LOOKED_AWAY },
      ],
    },
    4: {
      // Dynamic based on previous choices
      dynamic: true,
      getContent: (flags) => {
        if (flags.has(FLAGS.INVESTIGATED)) {
          return {
            sender: 'FROM: UNKNOWN <encrypted-relay>',
            text: `Good. You're listening.\n\nAttached: shipping manifests, forged provenance documents, and wire transfers from Meridian to a known smuggling ring.\n\nThe people breaking in — they work for the Kareshan Cultural Recovery Office. They've been trying to get the diamond back through legal channels for months. Meridian's lawyers buried every case.\n\nThis is their last option.\n\nYou can still do your job tonight. I'm not asking you to let them in. But after this shift — you'll have a choice to make.\n\nThe world should know what Meridian is.`,
            choices: [
              { text: '> I\'ll finish the shift. Then we talk.', flag: FLAGS.REBEL },
              { text: '> I\'ve seen enough. Forwarding this to management.', flag: FLAGS.LOYAL },
            ],
          };
        } else {
          return {
            sender: 'FROM: Management <ops@meridian-corp.net>',
            text: `Operator,\n\nWe've noticed increased breach attempts. Your performance has been adequate.\n\nEffective immediately: your contract is extended. Compensation increased by 40%.\n\nWe value loyalty. The Hargrove Collection must remain secure at all costs.\n\nDo not engage with any external communications. Report anything suspicious to this address.\n\nOne more shift. Keep the diamond safe.`,
            choices: [
              { text: '> The pay raise is appreciated. I\'ll hold the line.', flag: FLAGS.LOYAL },
              { text: '> "At all costs" — what exactly does that mean?', flag: FLAGS.QUESTION_CLIENT },
            ],
          };
        }
      },
    },
    5: {
      dynamic: true,
      getContent: (flags) => {
        // Final pre-shift message varies based on accumulated flags
        if (flags.has(FLAGS.REBEL)) {
          return {
            sender: 'FROM: UNKNOWN <encrypted-relay>',
            text: `Last shift. Here's the plan.\n\nComplete your duties — protect the vault as normal. After the shift ends, I'll trigger a dead man's switch that sends everything to the press.\n\nMeridian won't be able to bury this. The diamond goes back to Karesha.\n\nYou did the right thing, operator. Whatever happens tonight — survive it.\n\nThey're sending everything they have.`,
            choices: [
              { text: '> Let\'s finish this.', flag: FLAGS.REBEL },
            ],
          };
        } else if (flags.has(FLAGS.NOTICED_INSIDER) && flags.has(FLAGS.QUESTION_CLIENT)) {
          return {
            sender: 'FROM: D. Chen <d.chen@meridian-corp.net>',
            text: `I shouldn't be sending this.\n\nI found the insider. It's not who you think — it's the SYSTEM. Meridian's AI security scheduler has been subtly creating gaps in coverage. Feeding patrol patterns to an external server.\n\nSomeone at Meridian is running both sides of this. The heists are insurance fraud. The diamond is real, the theft is staged, and we're the plausible deniability.\n\nI'm going to management with this. If I don't message you again...\n\nJust survive tonight.\n\n- Chen`,
            choices: [
              { text: '> Be careful, Chen. I\'ll hold the fort.', flag: FLAGS.LOYAL },
            ],
          };
        } else {
          return {
            sender: 'FROM: Management <ops@meridian-corp.net>',
            text: `Final shift, operator.\n\nIntelligence suggests tonight's breach attempt will be the most aggressive yet. We have full confidence in your abilities.\n\nRemember: the diamond is everything. Meridian's reputation — and yours — depends on tonight.\n\nGive them nothing.\n\n// END TRANSMISSION`,
            choices: [
              { text: '> Copy that. They won\'t get through.', flag: FLAGS.LOYAL },
            ],
          };
        }
      },
    },
  };

  // Endings based on accumulated flags + game outcome
  function getEnding(flags, survived) {
    if (!survived) {
      return {
        title: 'SECURITY BREACH',
        text: 'The diamond is gone. Meridian Security Corp terminates your contract effective immediately. The official report blames operator error. You never learn the full truth.',
        type: 'fail',
      };
    }

    if (flags.has(FLAGS.REBEL)) {
      return {
        title: 'THE WHISTLEBLOWER',
        text: 'You survived all five shifts. The next morning, the story breaks across every major news outlet. Meridian Corp\'s stolen diamond, the forged documents, the staged heists — all of it exposed.\n\nThe Koh-i-Sera diamond is returned to the National Museum of Karesha. Meridian\'s board faces criminal charges.\n\nYou\'re out of a job, but your conscience is clear. A journalist calls you a hero. Chen buys you a drink.\n\nSometimes the right thing and the hard thing are the same thing.',
        type: 'whistleblower',
      };
    }

    if (flags.has(FLAGS.NOTICED_INSIDER) && flags.has(FLAGS.QUESTION_CLIENT)) {
      return {
        title: 'THE TRUTH BENEATH',
        text: 'You survived. Chen\'s investigation reaches the board before they can cover it up.\n\nTurns out Meridian\'s own AI was orchestrating the break-ins — an elaborate insurance fraud scheme worth ten times the diamond\'s value. The real crime was never about the jewel.\n\nChen gets promoted. You get reassigned to a quiet corporate office. The diamond sits in its vault, a prop in a game that\'s finally over.\n\nYou did your job. You just wish the job had been real.',
        type: 'conspiracy',
      };
    }

    return {
      title: 'THE LOYAL GUARD',
      text: 'Five shifts. Five successful defenses. Meridian Security Corp awards you their highest commendation.\n\nThe diamond remains in the vault. The break-in attempts stop. You never hear from the anonymous source again. Chen transfers to another division.\n\nThe pay is good. The work is steady. And late at night, alone at your monitors, you sometimes wonder if you were guarding the right thing.\n\nBut that\'s above your pay grade.',
      type: 'loyal',
    };
  }

  // Show a story beat in the narrative screen
  function showBeat(shiftNum, flags, onComplete) {
    const beatDef = STORY_BEATS[shiftNum];
    if (!beatDef) { onComplete(); return; }

    let beat;
    if (beatDef.dynamic) {
      beat = beatDef.getContent(flags);
    } else {
      beat = beatDef;
    }

    const screen = document.getElementById('narrative-screen');
    const senderEl = document.getElementById('narrative-sender');
    const textEl = document.getElementById('narrative-text');
    const choicesEl = document.getElementById('narrative-choices');

    senderEl.textContent = beat.sender;
    textEl.textContent = '';
    choicesEl.innerHTML = '';

    // Typewriter effect
    let charIndex = 0;
    const fullText = beat.text;
    const typeSpeed = 18;

    function typeNext() {
      if (charIndex < fullText.length) {
        textEl.textContent = fullText.substring(0, charIndex + 1);
        charIndex++;
        setTimeout(typeNext, typeSpeed);
      } else {
        // Show choices
        for (const choice of beat.choices) {
          const btn = document.createElement('button');
          btn.className = 'narrative-choice';
          btn.textContent = choice.text;
          btn.addEventListener('click', () => {
            if (choice.flag) flags.add(choice.flag);
            onComplete();
          });
          choicesEl.appendChild(btn);
        }
      }
    }

    // Allow clicking to skip typewriter
    const skipHandler = () => {
      if (charIndex < fullText.length) {
        charIndex = fullText.length;
        textEl.textContent = fullText;
      }
    };
    textEl.addEventListener('click', skipHandler, { once: false });

    // Switch to narrative screen
    document.querySelectorAll('.screen-layer').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');

    typeNext();
  }

  return { FLAGS, showBeat, getEnding };
})();
