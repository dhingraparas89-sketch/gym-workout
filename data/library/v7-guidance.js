// Per-exercise safety guidance and, for each common mistake, why it matters and how to fix it
// (round 7, UI). Read by js/ui/detail.js: V7_GUIDANCE[ex.id || ex.slug] = { s: [safety notes],
// m: [[mistake as written in ex.mistakes, why it matters, how to fix it], ...] }. Mistakes are
// matched to ex.mistakes by their wording (exact first, then closest wording), so a lightly
// reworded mistake still finds its text. V7_EQUIP_TIPS[ex.equip] = setup notes for that kind of
// equipment. General coaching guidance only: conservative, no medical claims, no diagnosis.

var V7_SAFETY_GENERAL = "General guidance, not medical advice. Warm up first, start with a load you can control for every rep, and stop if you feel sharp, sudden or radiating pain. If you have an injury, a medical condition or are pregnant, check with a qualified professional before training.";

var V7_EQUIP_TIPS = {
  barbell: ["Put collars on both ends so the plates cannot slide.", "In a rack, set the safety arms or pins just below the lowest point of the rep.", "Load the bar evenly and check both sides before lifting."],
  dumbbell: ["Pick dumbbells you can control for every rep; a lighter pair with full range teaches more than a heavy pair with half reps.", "Lift them from the floor or rack with a flat back, and set them down under control."],
  cable: ["Set the pulley height and attachment before loading the stack.", "Check the clip and cable for wear, and keep a stable stance so the stack, not your body, moves.", "Return the stack slowly; do not let the plates crash."],
  machine: ["Adjust the seat and pads so the working joint lines up with the machine's pivot (usually marked).", "Start light to check the range of the machine, and lower the stack under control."],
  bodyweight: ["Use a clear, non-slip surface with room around you.", "Make it easier (a raised surface, shorter range, fewer reps) until every rep looks like the demonstration."],
  kettlebell: ["Use a clear space with nobody in front of or behind you.", "Start with a bell you can control easily; grip it firmly and keep the swing path close."],
  band: ["Check the band for nicks or tears before each session, and anchor it securely.", "Keep the band away from your face, and release it slowly rather than letting it snap back."],
  other: ["Check that the equipment is stable, secured and suitable for your weight before you start.", "Clear the space around you and start with an easy setting."]
};

var V7_GUIDANCE = {
  "barbell-bench-press": { s: ["Use a spotter or a rack with safety arms set just below chest height when working near your limit.", "Keep the feet planted and the upper back pinned to the bench; lower the bar under control rather than dropping it."], m: [
    ["Stopping halfway down", "A partial descent skips the stretched, hardest part of the press, so the chest and triceps get less training through their full range.", "Lower the bar under control until it lightly touches the lower chest, then press."],
    ["Bouncing the bar off the chest", "The rebound does part of the work and the chest absorbs an uncontrolled impact, which removes control at the bottom.", "Lower slowly, pause briefly at a light touch, then press."],
    ["Elbows flared to 90°", "Fully flared elbows put more stress through the front of the shoulder and shorten the chest's useful range.", "Tuck the elbows to roughly 45-70° from the torso so the forearms stay under the bar."],
    ["Butt lifting off the bench", "Lifting the hips turns the press into a steep decline and arches the lower back, changing the movement and how it loads the spine.", "Keep the glutes on the bench and drive the feet into the floor without lifting the hips; reduce the load if needed."]] },
  "incline-dumbbell-press": { s: ["Get the dumbbells into position by resting them on the thighs and rolling back; at the end, bring them to the chest before sitting up.", "Keep the bench at a moderate incline (about 30°) and the dumbbells over the elbows."], m: [
    ["Half reps at the top", "Stopping short keeps the upper chest out of its stretched range, where much of the training effect comes from.", "Lower the dumbbells until they are level with the upper chest, with a controlled stretch, before pressing."],
    ["Bench too steep (turns into a shoulder press)", "A steep bench shifts the work to the front of the shoulders, so it trains a different movement.", "Set the bench to about 30°, low enough that the dumbbells travel to the upper chest."],
    ["Dumbbells drifting wide", "When the weights move outside the elbows the shoulder carries a long lever, and control at the bottom suffers.", "Keep the forearms vertical, wrists stacked over the elbows, and press the dumbbells up and slightly together."]] },
  "cable-fly": { s: ["Choose a weight light enough to keep a fixed elbow bend; the stretch at the back should be controlled, never forced.", "Use a split stance so the cables cannot pull you off balance."], m: [
    ["Bending and straightening the elbows", "Changing the elbow angle turns the fly into a press, so the triceps help and the chest loses its long-lever stretch.", "Set a soft bend in the elbows at the start and keep that angle; move only at the shoulder."],
    ["Too heavy, so the torso rocks", "Rocking the torso uses momentum, so the chest does less and control at the stretch is lost.", "Reduce the load until the torso stays still and only the arms move."],
    ["Shoulders rolling forward", "Rounding the shoulders forward shifts load to the front of the shoulder and reduces chest involvement.", "Keep the chest up and shoulder blades gently set back throughout, and bring the hands together in front of the chest."]] },
  "machine-chest-press": { s: ["Adjust the seat so the handles line up with the middle of the chest before loading the stack.", "Lower the weight under control; do not let the plates crash between reps."], m: [
    ["Shoulders rolling off the pad", "When the shoulders come forward the front of the shoulder takes over and the chest does less.", "Keep the upper back against the pad and the shoulder blades gently set back as you press."],
    ["Seat too low or too high", "A poorly set seat changes the pressing angle and can place the shoulder in an awkward position.", "Set the seat so the handles are level with the middle of the chest."],
    ["Letting the stack slam", "Dropping the weight skips the controlled lowering and jars the joints at the end of the range.", "Return the handles slowly and stop just before the plates touch."]] },
  "push-up": { s: ["If a full push-up breaks form, raise the hands on a bench or do them from the knees.", "Keep the hands under the shoulders on a non-slip surface, and stop if your wrists hurt; fists or handles can help."], m: [
    ["Hips sagging", "A sagging midsection lets the lower back arch under bodyweight and takes work away from the core and chest.", "Squeeze the glutes and brace the abs to hold a straight line from head to heels; shorten the set when it breaks."],
    ["Head poking forward", "Reaching with the chin shortens the range for the chest and strains the neck.", "Keep the head in line with the spine, looking at the floor a little ahead of the hands, and lead with the chest."],
    ["Half reps", "Stopping halfway leaves out the bottom of the movement, where the chest and triceps work hardest.", "Lower until the chest is close to the floor, then press back to straight arms; use an incline if needed."]] },
  "deadlift": { s: ["Learn the hinge with light weight first; stop the set when you cannot keep a neutral back.", "Keep the bar close to the legs and lift from a stable, flat stance; use plates of standard height or blocks so the bar starts at mid-shin."], m: [
    ["Rounded lower back", "Rounding under load shifts stress from the hips and legs onto the lower back, a common reason the lift feels hard on the back.", "Brace before you pull, set the chest up and the back flat, and lower the load until you can hold that position."],
    ["Bar drifting away from the legs", "A bar out in front makes a longer lever for the lower back and makes the lift harder for no benefit.", "Keep the bar in contact with or very close to the legs all the way up; engage the lats as if pushing the bar toward the shins."],
    ["Hips shooting up first", "When the hips rise before the shoulders the legs stop helping and the back does more of the lift.", "Push the floor away with the legs so the hips and shoulders rise together off the floor."],
    ["Leaning back at lockout", "Leaning back over-extends the lower back at the top without adding anything to the lift.", "Finish by standing tall with the hips through and the ribs down; stop when you are upright."]] },
  "sumo-deadlift": { s: ["Take a wide stance only as far as your hips allow, with the toes turned out and the knees following the toes.", "Keep the back neutral and the bar close; learn the position with light weight first."], m: [
    ["Knees caving in", "Knees collapsing inward take the hips out of the lift and stress the knees.", "Push the knees out over the toes as you drive the floor away."],
    ["Hips shooting up first", "When the hips rise first the legs stop helping and the lower back takes over.", "Keep the chest up and push through the legs so hips and shoulders rise together."],
    ["Rounded lower back", "Rounding shifts load from the hips onto the lower back.", "Brace before you pull, keep the chest up and reduce the load until you can hold a flat back."],
    ["Bar drifting away from the legs", "A bar out in front makes a longer lever for the lower back.", "Keep the bar close to the legs from the floor to lockout, pulling it back toward the body."],
    ["Stance too wide", "A stance wider than the hips allow can force the knees in and the back to round.", "Narrow the stance until the shins can stay close to vertical with the knees over the toes."]] },
  "pull-up": { s: ["Start from a dead hang with a controlled grip; use a band or an assisted machine until you can do strict reps.", "Lower yourself under control; do not drop into the bottom."], m: [
    ["Kipping and swinging", "Swinging uses momentum from the legs and hips, so the back and arms do less of the pull and control is lost.", "Start each rep from a still hang, keep the legs quiet and pull with the arms and back."],
    ["Half reps at the top", "Stopping short of straight arms skips the stretched position the lats are trained through.", "Lower until the arms are straight (without losing shoulder control) before the next rep."],
    ["Shrugging the shoulders to the ears", "Shrugging lets the upper traps take over and puts the shoulder in a less stable position.", "Start each pull by drawing the shoulder blades down, and keep the shoulders away from the ears."]] },
  "barbell-row": { s: ["Use a load you can row without standing up; the hinge position is demanding for the lower back.", "Brace and keep a neutral back throughout; set the bar down if your back starts to round."], m: [
    ["Standing up to yank the bar", "Standing up turns the row into a partial deadlift with momentum, so the back muscles get less of the work.", "Hold the torso angle fixed and move only the arms and shoulder blades; reduce the load if needed."],
    ["Rounded back", "Rounding under load in a hinged position stresses the lower back.", "Brace, push the hips back and keep the chest up with a flat back through every rep."],
    ["Shrugging instead of rowing", "Shrugging moves the work to the upper traps and away from the mid back and lats.", "Pull the elbows back toward the hips and squeeze the shoulder blades together, keeping the shoulders down."]] },
  "lat-pulldown": { s: ["Set the thigh pad so you stay seated, and return the bar slowly to the top.", "Pull the bar to the front of the body, never behind the neck."], m: [
    ["Leaning far back", "Leaning back turns the pulldown into a row and lets body weight help, so the lats do less.", "Keep a slight backward lean only, chest up, and pull straight down to the upper chest."],
    ["Pulling behind the neck", "Pulling behind the neck forces the head forward and the shoulder into an awkward position for little benefit.", "Pull to the top of the chest in front of the face."],
    ["Short range at the top", "Not letting the arms straighten skips the stretched position for the lats.", "Let the bar rise until the arms are straight and the lats are stretched, while keeping control."]] },
  "seated-cable-row": { s: ["Sit with the knees slightly bent and the feet braced; keep the back neutral throughout.", "Return the handle slowly so the stack does not pull you forward."], m: [
    ["Rounding forward then yanking", "Rounding and jerking uses the lower back and momentum instead of the back muscles.", "Keep the chest up and the torso still, and start each pull with the shoulder blades."],
    ["Rocking the torso", "Rocking lets the hips and lower back move the weight, so the back muscles do less.", "Fix the torso upright and move only the arms and shoulder blades; reduce the load if needed."],
    ["Shrugging", "Shrugging shifts work to the upper traps instead of the mid back and lats.", "Draw the shoulders down and back, and pull the elbows toward the hips."]] },
  "back-squat": { s: ["Squat in a rack with the safety arms set just below your lowest point, or with a spotter.", "Use a depth you can reach with a neutral back and heels down; that depth varies between people."], m: [
    ["Back rounding at the bottom", "Rounding under the bar shifts load from the hips and legs onto the lower back.", "Brace before each rep, keep the chest up and only squat as deep as you can with a flat back."],
    ["Knees caving in", "Knees collapsing inward take load off the hips and place it on the knees in a poorly aligned position.", "Push the knees out so they track over the toes on the way down and up."],
    ["Heels lifting", "Rising onto the toes shifts the weight forward and makes the squat less stable.", "Keep the whole foot on the floor; sit the hips back and, if needed, widen the stance a little or work on ankle mobility."],
    ["Cutting depth", "A shallow squat trains a shorter range, so the glutes and quads do less work through the bottom.", "Lower until the hip crease reaches about knee height, as far as you can with good form."]] },
  "romanian-deadlift": { s: ["The stretch on the hamstrings sets the range: stop when the hips stop moving back, not when the bar reaches the floor.", "Keep the bar close and the back neutral; use a load you can control on the way down."], m: [
    ["Rounding the back to reach lower", "Rounding to gain range moves the stretch from the hamstrings to the lower back.", "Push the hips back with a flat back and stop where the hamstrings limit you, usually around mid-shin."],
    ["Squatting instead of hinging", "Bending the knees a lot turns it into a squat, so the hamstrings are not lengthened.", "Keep a soft, fixed knee bend and move by pushing the hips back."],
    ["Bar drifting forward", "A bar away from the legs lengthens the lever on the lower back.", "Slide the bar down the thighs, keeping it close to the legs throughout."]] },
  "leg-press": { s: ["Use the safety stops, and never fully lock the knees under heavy load.", "Keep the lower back and hips on the pad through the whole range."], m: [
    ["Going so deep the hips curl up", "When the pelvis rolls up off the pad, the lower back rounds under load.", "Lower only as far as you can with the hips and lower back on the pad."],
    ["Knees caving in", "Knees collapsing inward load the knee out of line.", "Keep the knees tracking in line with the toes as you press."],
    ["Heels lifting", "Pushing through the toes shifts load to the front of the foot and the knees.", "Press through the whole foot, and place the feet a little higher on the platform if the heels lift."]] },
  "walking-lunge": { s: ["Use a clear walkway and start without weights until your balance is steady.", "Keep the step long enough that the front knee stays comfortable; hold the dumbbells at your sides."], m: [
    ["Knee shooting past the toes", "Some forward knee travel is normal, but driving the knee far forward with the heel lifting shifts load to the front of the knee and costs balance.", "Take a longer step and drop the back knee straight down, keeping the front heel planted."],
    ["Short choppy steps", "Short steps limit the range and push the front knee forward.", "Take a step long enough that both knees reach about 90° at the bottom."],
    ["Front heel lifting", "Lifting the front heel reduces balance and moves the load forward onto the knee.", "Keep the front foot flat and push up through the heel and midfoot."]] },
  "leg-curl": { s: ["Set the ankle pad just above the heels and the knees in line with the machine's pivot.", "Lower the weight slowly; do not let it drop."], m: [
    ["Hips piking off the pad", "Lifting the hips lets the lower back and hip flexors help, so the hamstrings do less.", "Keep the hips pressed into the pad; reduce the load if needed."],
    ["Half reps", "A partial curl leaves out part of the hamstrings' range.", "Curl until the pad is close to the glutes and lower until the knees are almost straight."],
    ["Dropping the weight", "Dropping skips the controlled lowering, where the hamstrings do useful work.", "Lower over about two to three seconds."]] },
  "standing-calf-raise": { s: ["Set the shoulder pads so you stand fully upright, and keep the knees straight but not forced.", "Move through a controlled range; do not bounce at the bottom."], m: [
    ["Bouncing out of the bottom", "Bouncing uses the tendon's rebound instead of the calf muscles and loads the Achilles abruptly.", "Pause briefly in the stretch at the bottom, then rise."],
    ["Bent knees", "Bending the knees shifts work away from the gastrocnemius.", "Keep the knees straight (not locked hard) throughout."],
    ["Partial reps", "Short reps skip the stretch and the top squeeze of the calves.", "Lower the heels fully, then rise as high as you can onto the balls of the feet."]] },
  "overhead-press": { s: ["Press from a rack with the bar at about shoulder height, and brace the trunk before each rep.", "If you cannot press overhead without arching the back, reduce the load or check shoulder mobility."], m: [
    ["Leaning back to finish", "Leaning back turns it into an incline press and arches the lower back under load.", "Squeeze the glutes and brace the abs so the torso stays upright; reduce the load if needed."],
    ["Bar drifting forward", "A bar in front of the body is harder to control and loads the shoulders and lower back more.", "Move the head back slightly, press the bar close to the face and finish with it over the mid-foot."],
    ["Flared ribs", "Flared ribs mean the lower back is arching to help the press.", "Breathe in, brace and keep the ribs down so the trunk stays stacked."]] },
  "arnold-press": { s: ["Use lighter dumbbells than for a standard press; the rotation is harder to control.", "Keep the back against the pad and move smoothly through the turn."], m: [
    ["Arching away from the weight", "Arching the back turns the press into an incline press and loads the lower back.", "Keep the back against the pad and the ribs down; reduce the weight if needed."],
    ["Rushing the rotation", "Spinning the dumbbells quickly loses control in the middle of the range.", "Rotate smoothly while pressing, so the palms face forward as the arms reach overhead."],
    ["Short range", "Stopping short trains less of the shoulders' range.", "Start with the dumbbells at chin height, palms facing you, and finish with the arms straight overhead."]] },
  "dumbbell-lateral-raise": { s: ["Use light dumbbells; the side delts move small loads on a long lever.", "Raise the arms to about shoulder height with a soft elbow bend."], m: [
    ["Shrugging the traps", "Shrugging lets the upper traps lift the weight instead of the side delts.", "Keep the shoulders down and lead the raise with the elbows."],
    ["Swinging the weight", "Momentum from the body does the work, so the delts do less.", "Use lighter dumbbells and raise slowly with the torso still."],
    ["Raising above shoulder height", "Going much higher brings in the traps more and is uncomfortable for some shoulders.", "Stop when the arms reach about shoulder height."]] },
  "face-pull": { s: ["Set the rope at about eye level and use a light to moderate load.", "Return the rope slowly so the stack does not pull you forward."], m: [
    ["Elbows dropping low", "Low elbows turn the face pull into a row, so the rear delts and rotator cuff do less.", "Keep the elbows high, level with the shoulders, and pull the rope toward the face."],
    ["Leaning back", "Leaning back uses body weight to move the stack.", "Stand tall with a stable stance and reduce the load."],
    ["Too heavy", "A heavy stack makes it hard to finish the rotation and the back muscles take over.", "Use a weight light enough to pull the hands apart beside the ears and hold briefly."]] },
  "rear-delt-fly": { s: ["Use light dumbbells and hold a stable, flat-backed hinge or use a bench to support the chest.", "Keep a soft bend in the elbows throughout."], m: [
    ["Shrugging into the raise", "Shrugging moves the work to the upper traps.", "Keep the shoulders down away from the ears and lead with the elbows."],
    ["Rowing instead of flying", "Bending the elbows into a row brings in the lats and mid back, so the rear delts do less.", "Keep the elbow angle fixed and move the arms out to the sides in an arc."],
    ["Rounded back", "Rounding the back in a hinge loads the lower back.", "Hinge with a flat back, or support the chest on an incline bench."]] },
  "barbell-curl": { s: ["Use a load you can curl without leaning back; keep the wrists straight.", "Lower the bar fully under control."], m: [
    ["Leaning back to swing", "Swinging the torso uses the back and hips to move the weight, so the biceps do less and the lower back arches.", "Stand tall with the elbows at the sides and reduce the load."],
    ["Elbows drifting forward", "Moving the elbows forward brings in the front delts and shortens the biceps' work.", "Keep the elbows close to the sides and move only the forearms."],
    ["Half reps", "Partial reps skip the bottom of the curl where the biceps lengthen.", "Lower until the arms are straight, then curl to the top."]] },
  "hammer-curl": { s: ["Keep a neutral grip (thumbs up) and the wrists straight.", "Use a load you can lower slowly."], m: [
    ["Elbows drifting forward", "The front delts help and the arm muscles get less of the work.", "Keep the elbows at the sides and move only the forearms."],
    ["Swinging", "Momentum does the lifting, so the arm muscles do less.", "Stand still, curl slowly and reduce the load if needed."],
    ["Wrists bending", "Bent wrists lose the neutral grip and can strain the wrist.", "Keep the wrists straight and in line with the forearm."]] },
  "triceps-rope-pushdown": { s: ["Stand close to the cable with the elbows at the sides.", "Return the rope slowly to about chest height."], m: [
    ["Leaning over the rope", "Leaning over lets body weight push the stack, so the triceps do less.", "Stand tall with a slight forward lean only and reduce the load."],
    ["Elbows flaring", "Flared elbows shift work to the shoulders and chest.", "Keep the elbows pinned to the sides throughout."],
    ["Half lockout", "Stopping short skips the end of the range where the triceps fully shorten.", "Straighten the arms fully and spread the rope ends at the bottom."]] },
  "skull-crusher": { s: ["Use a moderate load and lower slowly; the bar travels near the head.", "A spotter or lighter EZ bar is sensible when learning it."], m: [
    ["Upper arms swinging", "Moving the upper arms turns the lift into a pullover and press, so the triceps do less.", "Keep the upper arms still, angled slightly back, and bend only at the elbows."],
    ["Elbows flaring", "Flared elbows move work to the chest and shoulders and can be uncomfortable for the elbows.", "Keep the elbows pointed up and about shoulder-width apart."],
    ["Dropping too fast", "A fast descent loses control near the head and skips the useful lowering phase.", "Lower the bar slowly to just above the forehead, or behind the head, and press back up."]] },
  "dips": { s: ["Only go as deep as your shoulders tolerate; stop if you feel pain at the front of the shoulder.", "Use an assisted machine or band until strict reps are controlled."], m: [
    ["Sinking too deep", "Very deep dips put the front of the shoulder under a large stretch under body weight.", "Lower until the upper arms are about parallel to the floor, or less if that is uncomfortable."],
    ["Shoulders rolling forward", "Rolled-forward shoulders place more stress on the front of the shoulder.", "Keep the chest up and shoulders down and back."],
    ["Swinging", "Swinging uses momentum and makes the bottom less controlled.", "Keep the legs still and move straight down and up."]] },
  "plank": { s: ["Hold only as long as the position stays straight; shorter good holds beat long sagging ones.", "Keep breathing steadily during the hold."], m: [
    ["Hips sagging", "A sagging midsection arches the lower back, taking the work off the abs.", "Squeeze the glutes, tuck the pelvis slightly and hold a straight line from head to heels."],
    ["Hips piked high", "Raised hips shorten the lever and make the plank easier without training the core as intended.", "Lower the hips until shoulders, hips and heels line up."],
    ["Holding the breath", "Holding the breath raises pressure and limits how long you can hold safely.", "Breathe slowly in and out while keeping the abs braced."]] },
  "hanging-leg-raise": { s: ["Get a firm grip and start from a still hang; use straps or a captain's chair if grip limits you.", "Lower the legs slowly to avoid swinging."], m: [
    ["Hip flexors take over", "If the pelvis never tilts up, the hip flexors lift the legs and the abs do little.", "Finish each rep by curling the pelvis up toward the ribs."],
    ["Swinging", "Momentum lifts the legs instead of the abs.", "Pause in a still hang between reps and raise the legs slowly."],
    ["Dropping the legs", "Dropping skips the controlled lowering and starts a swing.", "Lower the legs over two to three seconds."]] },
  "cable-crunch": { s: ["Kneel far enough from the stack that the weight does not touch down at the top.", "Curl the spine through a comfortable range; do not force it."], m: [
    ["Pulling with the arms", "Pulling the rope with the arms lets the arms and lats move the weight.", "Hold the rope fixed beside the head and move by curling the trunk."],
    ["Sitting the hips back", "Sitting back turns the movement into a hip hinge, so the abs do less.", "Keep the hips still over the knees and bring the ribs toward the pelvis."],
    ["Too heavy", "A heavy stack pulls you out of position and reduces the curl.", "Use a weight that allows a full, controlled curl."]] },
  "pallof-press": { s: ["Stand side-on with a stable stance and a light load.", "Press and return slowly; the goal is to resist the rotation."], m: [
    ["Leaning away from the cable", "Leaning away avoids the rotation the core is meant to resist.", "Stand tall and square, and move further from the stack only as far as you can stay upright."],
    ["Hips shifting", "Moving the hips lets the cable rotate the body.", "Brace the glutes and abs and keep the hips facing forward."],
    ["Rotating with the handle", "Turning toward the cable means the core is not resisting the pull.", "Keep the hands in the middle of the chest as you press out and in."]] },
  "dead-bug": { s: ["Keep the lower back gently pressed toward the floor; shorten the reach if it lifts.", "Move slowly and breathe out as you reach."], m: [
    ["Lower back arching up", "When the back arches the abs have lost control of the pelvis.", "Reduce the reach (bend the knee more or lift the leg higher) so the back stays down."],
    ["Moving too fast", "Speed replaces control, which is the point of this exercise.", "Take two to three seconds to reach and return."],
    ["Holding the breath", "Holding the breath makes it harder to keep the core braced naturally.", "Breathe out as the arm and leg reach, breathe in as they return."]] },
  "incline-bench-press": { s: ["Use uprights with safety arms or a spotter for heavy sets.", "Keep the glutes on the seat and the upper back on the pad."], m: [
    ["Arching the lower back off the bench", "A big arch lowers the angle so it becomes a flat press, and loads the lower back.", "Keep the glutes and upper back on the bench, ribs down."],
    ["Lowering the bar to the mid-chest like a flat press", "On an incline that path puts the bar ahead of the shoulders and is harder to control.", "Lower the bar to the upper chest, just below the collarbones."],
    ["Bouncing the bar off the chest", "The rebound uses momentum and reduces control.", "Touch lightly and pause, then press."]] },
  "decline-bench-press": { s: ["Secure the legs in the leg hold before unracking, and use a spotter: getting out from under a stuck bar is harder on a decline.", "Lower the bar to the lower chest."], m: [
    ["Lowering the bar toward the neck", "A bar path toward the neck is risky and stresses the shoulders.", "Lower the bar to the lower chest, under control."],
    ["Bouncing the bar off the chest", "The rebound uses momentum instead of the chest and reduces control.", "Touch lightly, pause, then press."],
    ["Losing the leg hold and sliding down the bench", "Sliding down changes the bar path and the stability of the whole lift.", "Lock the feet under the pads and keep the hips on the bench."]] },
  "dumbbell-bench-press": { s: ["Bring the dumbbells into position from the thighs and lower them to the chest before sitting up at the end.", "Choose a weight you can control at the bottom."], m: [
    ["Elbows flaring straight out to the sides", "Fully flared elbows place more stress on the front of the shoulder.", "Keep the elbows at about 45-70° from the torso."],
    ["Stopping short of a full stretch", "A short descent skips the stretched range of the chest.", "Lower until the dumbbells are beside the chest, with control."],
    ["Dumbbells drifting toward the face", "A path toward the face loads the shoulders more and is harder to control.", "Lower the dumbbells toward the mid-chest, wrists over elbows."]] },
  "dumbbell-fly": { s: ["Use light dumbbells and a soft elbow bend; the stretch should be controlled, not forced.", "Stop the descent around bench height."], m: [
    ["Bending the elbows into a press", "Changing the elbow angle turns the fly into a press, so the chest loses its long-lever stretch.", "Fix a soft elbow bend and move only at the shoulder."],
    ["Going too heavy to control the stretch", "Heavy dumbbells pull the shoulder into a large uncontrolled stretch.", "Use a weight that you can lower slowly and stop at a comfortable stretch."],
    ["Dropping the dumbbells below the bench", "Going too low puts the front of the shoulder under a large stretch.", "Stop when the upper arms are about level with the torso."]] },
  "close-grip-bench-press": { s: ["Use a rack with safety arms or a spotter.", "Grip about shoulder-width; a very narrow grip strains the wrists."], m: [
    ["Hands too close together", "A very narrow grip bends the wrists and can be uncomfortable for them and the elbows.", "Grip about shoulder-width, wrists straight over the elbows."],
    ["Elbows flaring out", "Flared elbows move work to the chest and shoulders.", "Keep the elbows close to the sides as you lower."],
    ["Bouncing the bar off the chest", "The rebound uses momentum instead of the triceps.", "Touch the lower chest lightly, pause, then press."]] },
  "overhead-triceps-extension": { s: ["Use a moderate dumbbell and lower slowly; the weight travels behind the head.", "Brace the trunk and keep the back against the pad."], m: [
    ["Elbows drifting forward", "Moving the elbows forward lets the shoulders help and shortens the triceps' stretch.", "Keep the upper arms close to vertical beside the head."],
    ["Elbows flaring out wide", "Wide elbows reduce the triceps' work and can be uncomfortable for the shoulders.", "Keep the elbows pointing forward, about head-width apart."],
    ["Arching the lower back", "Arching uses the trunk to help and loads the lower back.", "Brace the abs, keep the ribs down and reduce the weight."]] },
  "dumbbell-kickback": { s: ["Support the torso on a bench with a flat back.", "Use a light dumbbell; the lever is long at full extension."], m: [
    ["Upper arm dropping and swinging", "If the upper arm moves, the shoulder helps and the triceps do less.", "Hold the upper arm still, parallel to the torso, and move only the forearm."],
    ["Short lockout", "Stopping short skips the end range where the triceps fully contract.", "Straighten the elbow fully and hold briefly."],
    ["Twisting the torso to swing the weight", "Twisting uses momentum from the trunk.", "Keep the shoulders square to the floor and reduce the weight."]] },
  "dumbbell-shoulder-press": { s: ["Bring the dumbbells to the shoulders from the thighs before pressing.", "Keep the back against the pad and the ribs down."], m: [
    ["Stopping short above the head", "A partial press skips the top of the range.", "Press until the arms are straight overhead, then lower to shoulder height."],
    ["Arching away from the pad", "Arching turns it into an incline press and loads the lower back.", "Keep the back on the pad and brace the abs; reduce the weight if needed."],
    ["Dumbbells drifting forward", "Forward drift lengthens the lever and is harder to control.", "Keep the forearms vertical and press the dumbbells up over the shoulders."]] },
  "front-raise": { s: ["Use light dumbbells and raise to about shoulder height.", "Keep the torso still."], m: [
    ["Leaning back to swing the weight", "Swinging uses the back and hips, so the front delts do less.", "Stand tall, brace and reduce the weight."],
    ["Raising above the head", "Raising much higher brings in the traps and is not needed for the front delts.", "Stop when the arms are about level with the shoulders."],
    ["Shrugging the shoulders", "Shrugging lets the upper traps lift the weight.", "Keep the shoulders down as the arms rise."]] },
  "cable-lateral-raise": { s: ["Use a light weight and stand side-on to the column with a stable stance.", "Raise to about shoulder height."], m: [
    ["Bending the elbow into an upright row", "Bending the elbow turns it into a row, so the traps help more.", "Keep a fixed soft elbow bend and lead with the elbow."],
    ["Shrugging the shoulder up", "Shrugging brings in the upper traps.", "Keep the shoulder down and away from the ear."],
    ["Leaning away from the column", "Leaning changes the line of pull and lets the body help.", "Stand upright, holding the column with the free hand if needed."]] },
  "upright-row": { s: ["Use a moderate load and a grip about shoulder-width or wider; some people find this movement uncomfortable for the shoulders and should choose a lateral raise instead.", "Stop the bar around lower-chest height."], m: [
    ["Pulling the bar up to the chin", "Pulling very high raises the elbows above the shoulders under load, which many shoulders do not tolerate well.", "Stop when the elbows reach about shoulder height."],
    ["Grip too narrow", "A narrow grip increases the inward rotation of the shoulder at the top.", "Use a grip about shoulder-width or a little wider."],
    ["Swinging the weight up with the hips", "Momentum from the hips does the lifting.", "Stand still and reduce the load."]] },
  "dumbbell-curl": { s: ["Keep the elbows at the sides and the wrists straight.", "Lower the dumbbells fully under control."], m: [
    ["Half reps that never straighten the arm", "Partial reps skip the stretched bottom of the curl.", "Lower until the arm is straight, then curl."],
    ["Swinging the torso", "Momentum from the torso lifts the weight, so the biceps do less.", "Stand tall and reduce the weight."],
    ["Elbows drifting forward", "The front delts help and the biceps' range shortens.", "Keep the elbows beside the torso and move only the forearms."]] },
  "incline-dumbbell-curl": { s: ["Set the bench at about 45° and use lighter dumbbells than for standing curls; the stretch is larger.", "Lower slowly into the stretch."], m: [
    ["Elbows swinging forward", "Moving the elbows forward removes the stretch that makes this curl useful.", "Keep the upper arms hanging straight down behind the torso."],
    ["Lifting the shoulders off the pad", "Coming off the pad shortens the stretch and lets the shoulders help.", "Keep the back and shoulders against the pad."],
    ["Cutting the stretch short", "Stopping short skips the lengthened position.", "Lower until the arms are straight."]] },
  "cable-curl": { s: ["Stand close to the low pulley with a stable stance.", "Return the bar slowly; do not let the stack drop."], m: [
    ["Leaning back to start the bar", "Leaning back uses body weight, so the biceps do less.", "Stand tall and reduce the load."],
    ["Elbows drifting forward", "The front delts help and the range shortens.", "Keep the elbows at the sides."],
    ["Letting the stack drop", "Dropping skips the controlled lowering.", "Lower over two to three seconds."]] },
  "preacher-curl": { s: ["Use a moderate load: the arms are fully supported, and the bottom of the curl stretches the biceps under load.", "Do not drop into a locked elbow at the bottom."], m: [
    ["Elbows lifting off the pad", "Lifting the elbows lets the shoulders help.", "Keep the backs of the upper arms on the pad."],
    ["Dropping fast into a locked elbow", "A fast drop at the bottom stresses the elbow at full stretch.", "Lower slowly and stop just short of locking the elbow hard."],
    ["Shoulders rolling forward over the bar", "Leaning over the bar helps lift it with body weight.", "Sit tall with the chest against the pad."]] },
  "assisted-pull-up": { s: ["Choose enough assistance to make every rep controlled, and step on and off the pad carefully.", "Lower slowly to straight arms."], m: [
    ["Half reps that never reach straight arms at the bottom.", "Partial reps skip the stretched position of the lats.", "Lower until the arms are straight while keeping the shoulders controlled."],
    ["Shrugging the shoulders up toward the ears.", "Shrugging lets the upper traps take over.", "Draw the shoulder blades down at the start of each pull."],
    ["Using so much assistance that the pad throws you up.", "Too much assistance makes the movement fast and uncontrolled.", "Reduce the counterweight until the pull is smooth and you have to work."]] },
  "dumbbell-row": { s: ["Support yourself on the bench with a flat back.", "Use a weight you can row without twisting."], m: [
    ["Twisting the torso open to swing the dumbbell up.", "Twisting uses momentum and the trunk instead of the back muscles.", "Keep the shoulders square to the floor and reduce the weight."],
    ["Shrugging the shoulder up toward the ear.", "Shrugging moves the work to the upper traps.", "Pull the elbow toward the hip with the shoulder down."],
    ["Cutting the stretch short at the bottom.", "Short reps skip the lengthened range of the lats.", "Let the arm straighten and the shoulder blade move forward at the bottom."]] },
  "t-bar-row": { s: ["Hold a flat-backed hinge throughout; set the bar down if your back starts to round.", "Use plates small enough that the handle reaches the chest."], m: [
    ["Rounding the lower back to reach the bar.", "Rounding in the hinge loads the lower back.", "Bend the knees, push the hips back and keep the chest up."],
    ["Standing up and heaving the bar with the hips.", "Using the hips turns it into a partial deadlift with momentum.", "Hold the torso angle and move only the arms and shoulder blades."],
    ["Cutting the pull short before the handle reaches the chest.", "A short pull skips the contracted range of the mid back.", "Pull until the handle touches the chest, then lower under control."]] },
  "single-arm-cable-row": { s: ["Use a split stance and a moderate weight.", "Return the handle slowly."], m: [
    ["Rocking the torso back to yank the handle.", "Rocking uses body weight instead of the back.", "Keep the torso still and reduce the weight."],
    ["Twisting the hips toward the cable.", "Twisting lets the trunk move the weight.", "Keep the hips square and let only the shoulder and arm move."],
    ["Shrugging the shoulder as the elbow comes back.", "Shrugging shifts work to the upper traps.", "Keep the shoulder down and pull the elbow toward the hip."]] },
  "straight-arm-pulldown": { s: ["Use a moderate weight with a slight hinge and a stable stance.", "Return the bar slowly."], m: [
    ["Bending the elbows so it turns into a triceps pushdown.", "Bending the elbows moves the work to the triceps.", "Keep the elbows almost straight and move only at the shoulders."],
    ["Rocking the torso to drive the bar down.", "Rocking uses body weight instead of the lats.", "Hold the hinge still and reduce the weight."],
    ["Shrugging the shoulders up at the top.", "Shrugging lets the traps take the load at the top.", "Keep the shoulders down as the arms rise."]] },
  "side-plank": { s: ["Keep the elbow directly under the shoulder; drop the knees to the floor to make it easier.", "Hold only as long as the line stays straight."], m: [
    ["The hips and chest roll forward toward the floor.", "Rolling forward takes load off the side of the core.", "Stack the shoulders and hips vertically and keep the chest facing forward."],
    ["The hips sag toward the mat.", "Sagging hips mean the obliques have stopped holding the position.", "Lift the hips into a straight line from head to feet, or shorten the hold."],
    ["The shoulder collapses with the elbow out of line.", "A collapsed shoulder hangs on the joint instead of the muscles.", "Place the elbow under the shoulder and push the floor away."]] },
  "crunch": { s: ["Support the head lightly with the hands without pulling on it.", "Move slowly through a short range."], m: [
    ["Leading with the head and cranking the neck forward.", "Pulling the head strains the neck and does little for the abs.", "Keep a fist-sized gap between chin and chest and curl from the ribs."],
    ["Swinging up with momentum.", "Momentum does the lifting instead of the abs.", "Curl up slowly, pause, and lower."],
    ["Lifting so high the hip flexors take over.", "Sitting all the way up brings in the hip flexors.", "Lift only until the shoulder blades leave the floor."]] },
  "knee-raise": { s: ["Keep the back against the pad and the forearms on the pads.", "Lower the legs slowly."], m: [
    ["Arching off the back pad and swinging the legs.", "Swinging uses momentum and arches the lower back.", "Keep the back on the pad and raise the knees slowly."],
    ["Stopping with the knees below the hips.", "A short raise skips the part where the abs curl the pelvis.", "Raise the knees to at least hip height and tilt the pelvis up."],
    ["Dropping the legs fast between reps.", "Dropping skips the controlled lowering and starts a swing.", "Lower over two to three seconds."]] },
  "russian-twist": { s: ["Start without weight and keep the back long; skip it if twisting under load bothers your back.", "Move slowly through a comfortable range."], m: [
    ["Rounding the back and slumping into the hips.", "Slumping puts the lower back in a rounded, loaded position.", "Sit tall with a long spine, leaning back only slightly."],
    ["Swinging only the arms while the chest stays put.", "Moving only the arms means the trunk is not rotating.", "Turn the chest and shoulders with the hands."],
    ["Letting the knees sway side to side.", "Swaying knees mean the hips rotate with the trunk.", "Keep the knees and hips still while the torso turns."]] },
  "ab-wheel-rollout": { s: ["Start with short rollouts and increase range only while the back stays flat.", "Use a mat under the knees."], m: [
    ["The lower back sags and arches at full extension.", "When the back sags, it takes the load the abs are meant to hold.", "Roll out only as far as you can keep the ribs down and back flat."],
    ["Piking the hips back instead of rolling out.", "Piking shortens the lever so the abs do less.", "Move the hips forward with the wheel, keeping a straight line from knees to shoulders."],
    ["Rolling farther than you can control.", "Over-reaching can drop you onto the floor and arch the back.", "Shorten the range or roll toward a wall as a stop."]] },
  "front-squat": { s: ["Squat in a rack with safety arms; if the bar slips forward, let it fall onto the arms and step back.", "Keep the elbows high to hold the bar on the shoulders."], m: [
    ["Elbows dropping so the chest folds forward", "Low elbows let the bar roll forward and the upper back rounds.", "Drive the elbows up and keep the chest tall."],
    ["Heels lifting as the knees travel forward", "Rising onto the toes shifts the load forward and reduces balance.", "Keep the whole foot down; elevate the heels slightly or work on ankle mobility."],
    ["Gripping the bar tight and loading the wrists", "A full grip with poor wrist mobility strains the wrists.", "Let the bar rest on the shoulders with fingertips only, or use a cross-arm grip."]] },
  "goblet-squat": { s: ["Hold the dumbbell vertically against the chest.", "Squat to a depth you can reach with a neutral back."], m: [
    ["Stopping well above parallel", "A shallow squat trains a shorter range.", "Lower until the hips are about knee height, as far as you can with good form."],
    ["Letting the dumbbell drift away from the chest", "A weight away from the body pulls the torso forward.", "Keep the dumbbell pressed against the chest throughout."],
    ["Heels coming off the floor", "Rising onto the toes reduces balance.", "Keep the whole foot down and widen the stance slightly if needed."]] },
  "hack-squat": { s: ["Use the machine's safety stops and do not lock the knees hard at the top.", "Keep the back and hips on the pad."], m: [
    ["Hips rolling off the pad at the bottom", "When the pelvis rolls off the pad the lower back rounds under load.", "Lower only as deep as you can with the hips on the pad."],
    ["Locking the knees hard at the top", "Snapping into a locked knee takes load off the muscles and onto the joint.", "Stop just short of a hard lockout."],
    ["Bouncing out of the bottom", "Bouncing uses momentum and loses control at the deepest point.", "Pause briefly at the bottom, then drive up."]] },
  "bulgarian-split-squat": { s: ["Practice without weight to find a stance where you can balance; a support nearby helps.", "Set the rear foot on the bench comfortably, laces down."], m: [
    ["The torso folding over the front thigh", "Folding forward loads the back and changes the target.", "Keep the chest up with only a slight forward lean."],
    ["Front foot too close so the heel lifts", "A short stance pushes the knee far forward and the heel up.", "Step the front foot further out so the heel stays down at the bottom."],
    ["Pushing off the back foot", "Pushing with the back leg takes work from the front leg.", "Treat the back foot as a balance point and drive up through the front foot."]] },
  "reverse-lunge": { s: ["Step back onto a clear floor and start without weights.", "Keep the front heel planted."], m: [
    ["Leaning over the front leg", "Folding forward loads the back and reduces quad work.", "Keep the torso upright, chest tall."],
    ["Short step that pushes the front knee forward", "A short step shifts load forward onto the knee.", "Step back far enough that both knees reach about 90°."],
    ["Wobbling side to side on landing", "Poor balance means the hips and knees are not controlled.", "Step straight back hip-width apart, and slow down."]] },
  "leg-extension": { s: ["Line the knee up with the machine's pivot and set the ankle pad above the feet.", "Lower slowly."], m: [
    ["Kicking the weight up with momentum", "Kicking uses momentum instead of the quads and jars the knee.", "Lift smoothly and lower over two to three seconds."],
    ["Hips lifting off the seat", "Lifting the hips changes the angle and lets the body help.", "Hold the handles and keep the hips down; reduce the weight."],
    ["Cutting the top short of full extension", "Stopping short skips the top of the quads' range.", "Straighten the knee fully and hold briefly."]] },
  "seated-calf-raise": { s: ["Set the knee pad snug over the thighs.", "Move through a controlled range without bouncing."], m: [
    ["Bouncing through a short range", "Bouncing uses tendon rebound and skips the stretch.", "Pause at the bottom, then rise fully."],
    ["Rolling onto the outside of the foot", "Rolling out loads the ankle unevenly.", "Push through the base of the big and second toes."],
    ["Lifting the pad with the hands", "The hands do work the calves should do.", "Rest the hands lightly and reduce the weight."]] },
  "hip-thrust": { s: ["Pad the bar and set the bench edge just below the shoulder blades.", "Finish with the ribs down, not with an arched back."], m: [
    ["Arching the lower back to get the hips higher", "Arching gives height through the spine, not the glutes.", "Tuck the chin and ribs, and finish when hips are level with the knees and shoulders."],
    ["Feet too far out so the hamstrings take over", "A long foot position makes the hamstrings do more.", "Place the feet so the shins are vertical at the top."],
    ["Bar rolling toward the stomach", "A rolling bar is uncomfortable and unstable.", "Hold the bar over the hip crease with both hands."]] },
  "glute-bridge": { s: ["Keep the feet flat and about hip-width apart.", "Finish without arching the lower back."], m: [
    ["Stopping before the hips are fully extended", "A partial bridge skips the top where the glutes work hardest.", "Lift until knees, hips and shoulders line up, and squeeze."],
    ["Arching the lower back instead of using the glutes", "The lower back makes the height, not the glutes.", "Keep the ribs down and tilt the pelvis slightly as you lift."],
    ["Feet too far away", "Far feet let the hamstrings take over.", "Bring the heels closer so the shins are near vertical at the top."]] },
  "cable-kickback": { s: ["Hold the column for balance and use a light weight.", "Keep the trunk still."], m: [
    ["Arching the lower back to swing the leg higher", "Arching makes the range in the lower back instead of the hip.", "Kick back only as far as the hip allows with a still back."],
    ["Rotating the hip open", "Turning the hip out moves work away from the glute max.", "Keep the hips square to the column."],
    ["Swinging with momentum", "Momentum does the work.", "Move slowly and pause at the top."]] },
  "step-up": { s: ["Use a stable box at a height where the thigh is about level with the floor or lower.", "Step down under control."], m: [
    ["Pushing off the trailing foot", "Pushing with the back leg takes the work from the leading leg.", "Keep the back foot light and drive up through the lead leg."],
    ["Folding forward over the lead leg", "Folding over moves load to the back.", "Keep the chest up with a slight forward lean."],
    ["Knee caving inward on the drive", "A caving knee loads the knee out of line.", "Keep the knee over the middle of the foot as you rise."]] },
  "sumo-squat": { s: ["Turn the toes out and keep the knees in line with them.", "Lower only as far as the back stays neutral."], m: [
    ["Rounding the back as the weight reaches for the floor", "Rounding loads the lower back.", "Keep the chest up and stop where the back starts to round."],
    ["Knees caving in", "Caving knees load the knee out of line.", "Push the knees out over the toes."],
    ["Heels lifting", "Lifting the heels reduces balance.", "Keep the whole foot down; adjust the stance width."]] },
  "hip-abduction": { s: ["Start light and set the pads at a comfortable starting width.", "Return slowly."], m: [
    ["Leaning forward and rocking the torso", "Rocking uses body weight instead of the hip muscles.", "Sit tall against the pad and reduce the weight."],
    ["Letting the weight snap back", "Skipping the return phase loses useful work.", "Return the pads slowly."],
    ["Short range at the end", "A short push skips part of the range.", "Open the legs as wide as is comfortable and pause."]] },
  "cable-crossover": { s: ["Use a split stance and a light-to-moderate weight.", "Keep a soft elbow bend."], m: [
    ["Bending and straightening the elbows into a press", "Pressing brings in the triceps and shortens the chest's stretch.", "Keep a fixed elbow angle and move at the shoulders."],
    ["Letting the shoulders roll forward", "Rounding shifts load to the front of the shoulder.", "Keep the chest up and shoulders back."],
    ["Using momentum from the torso", "Rocking does the work instead of the chest.", "Keep the torso still and reduce the weight."]] },
  "incline-push-up": { s: ["Use a stable bench or wall that will not slide.", "A higher surface makes it easier."], m: [
    ["Hips sagging", "A sagging midsection arches the lower back.", "Brace the abs and glutes to hold a straight line."],
    ["Elbows flaring straight out", "Flared elbows place more stress on the front of the shoulder.", "Keep the elbows about 45° from the torso."],
    ["Head reaching forward", "Reaching with the chin strains the neck and shortens the range.", "Keep the head in line and lower the chest to the bench."]] },
  "pec-deck-fly": { s: ["Set the seat so the handles are at chest height.", "Do not let the arms swing back past a comfortable stretch."], m: [
    ["Shoulders rolling forward at the squeeze", "Rounding shifts work to the front of the shoulder.", "Keep the back on the pad and the chest up."],
    ["Letting the arms snap back past the stretch", "A fast return pulls the shoulder into an uncontrolled stretch.", "Return slowly to a comfortable stretch."],
    ["Seat too low or too high", "A poor seat height changes the angle and can strain the shoulder.", "Set the handles level with the middle of the chest."]] },
  "chest-supported-row": { s: ["Keep the chest on the pad throughout.", "Use a weight you can pull without lifting off."], m: [
    ["Lifting the chest off the pad to heave the weight", "Lifting off uses momentum and the lower back.", "Keep the chest on the pad and reduce the weight."],
    ["Shrugging the shoulders up", "Shrugging moves work to the upper traps.", "Keep the shoulders down and pull the elbows back."],
    ["Short pulls without a squeeze", "A short pull skips the contracted position.", "Pull until the elbows pass the torso and squeeze the shoulder blades."]] },
  "back-extension": { s: ["Set the hip pad just below the hip crease.", "Rise to a straight line, not beyond."], m: [
    ["Arching the lower back past straight at the top", "Over-extending loads the lower back without benefit.", "Stop when the body is in a straight line."],
    ["Rounding the back at the bottom", "Rounding under load stresses the lower back.", "Hinge at the hips with a neutral back."],
    ["Swinging up fast", "Momentum does the work.", "Rise and lower slowly."]] },
  "inverted-row": { s: ["Use a secure bar in a rack at a height that suits your strength; higher is easier.", "Keep the body in a straight line."], m: [
    ["Hips sagging toward the floor", "Sagging hips mean the core is not holding the line.", "Squeeze the glutes and brace."],
    ["Pulling the chin, not the chest, to the bar", "Reaching with the chin shortens the pull and strains the neck.", "Pull the chest to the bar with a neutral neck."],
    ["Half reps", "Short reps skip part of the range.", "Lower to straight arms and pull the chest to the bar."]] },
  "reverse-pec-deck": { s: ["Set the seat so the handles are at shoulder height.", "Use a light weight."], m: [
    ["Shrugging and leaning back off the pad", "Leaning back and shrugging bring in the traps and momentum.", "Keep the chest on the pad and the shoulders down."],
    ["Squeezing the shoulder blades only (rowing)", "Moving mostly at the shoulder blades turns it into a row, so the rear delts do less.", "Sweep the arms back in an arc."],
    ["Swinging the weight", "Momentum does the work.", "Move slowly and reduce the weight."]] },
  "dumbbell-shrug": { s: ["Use a weight you can lift straight up and down.", "Keep the neck neutral."], m: [
    ["Bending the elbows to pull", "Bending the arms lets the biceps help.", "Keep the arms straight and lift with the shoulders."],
    ["Rolling the shoulders in circles", "Rolling adds nothing and can irritate the shoulder.", "Lift straight up and lower straight down."],
    ["Poking the head forward", "Forward head strains the neck.", "Keep the chin tucked slightly and the head over the shoulders."]] },
  "alternating-curl": { s: ["Keep the elbows at the sides and the torso still.", "Lower each dumbbell fully under control."], m: [
    ["Swinging the torso", "Momentum from the torso lifts the weight.", "Stand still and reduce the weight."],
    ["Elbows drifting forward", "The front delts help and the range shortens.", "Keep the elbows beside the torso."],
    ["Dropping the weight fast", "Dropping skips the controlled lowering.", "Lower over two to three seconds."]] },
  "concentration-curl": { s: ["Brace the upper arm against the inner thigh.", "Lower fully under control."], m: [
    ["Lifting the torso to help the curl", "Moving the torso does part of the lift.", "Keep the torso still and move only the forearm."],
    ["Upper arm coming off the thigh", "Losing the support lets the shoulder help.", "Keep the back of the upper arm against the thigh."],
    ["Cutting the bottom short", "Short reps skip the stretched range.", "Lower until the arm is straight."]] },
  "reverse-curl": { s: ["Use a lighter load than for a standard curl.", "Keep the wrists straight."], m: [
    ["Wrists bending back", "Bent wrists strain them and reduce the forearm work.", "Keep the wrists in line with the forearms."],
    ["Elbows drifting forward", "The front delts help.", "Keep the elbows at the sides."],
    ["Swinging the torso", "Momentum lifts the weight.", "Stand still and reduce the load."]] },
  "wrist-curl": { s: ["Use a light load; the wrist moves small weights.", "Rest the forearms on the thighs or a bench."], m: [
    ["Lifting the forearms off the thighs", "Moving the forearms lets the elbows help.", "Keep the forearms in contact with the support."],
    ["Bouncing the bar", "Bouncing loads the wrist abruptly.", "Move slowly through the full wrist range."],
    ["Too heavy to finish the range", "Heavy loads shorten the range.", "Use a weight that allows full flexion."]] },
  "cable-pushdown": { s: ["Stand close to the cable with the elbows at the sides.", "Return the bar slowly."], m: [
    ["Leaning over the bar to push with bodyweight", "Body weight moves the stack, not the triceps.", "Stand tall and reduce the weight."],
    ["Elbows flaring and drifting forward", "Moving elbows shift work to the shoulders and chest.", "Pin the elbows to the sides."],
    ["Short lockout", "Stopping short skips full triceps contraction.", "Straighten the arms fully."]] },
  "assisted-dip": { s: ["Use enough assistance for controlled reps and step on and off carefully.", "Only go as deep as your shoulders tolerate."], m: [
    ["Dropping too deep and stretching the shoulder", "A very deep dip stretches the front of the shoulder under load.", "Stop when the upper arms are about parallel to the floor."],
    ["Shrugging at the bottom", "Shrugging puts the shoulder in a less stable position.", "Keep the shoulders down away from the ears."],
    ["Elbows flaring wide", "Wide elbows load the shoulders more.", "Keep the elbows pointing back."]] },
  "bench-dip": { s: ["Use a stable bench and keep the hips close to it.", "Many people find the bottom position hard on the shoulders: keep the depth modest."], m: [
    ["Shoulders rolling forward at the bottom", "Rolled shoulders stress the front of the shoulder.", "Keep the chest up and shoulders back."],
    ["Hips drifting far from the bench", "Far hips change the angle and load the shoulders more.", "Keep the back close to the bench."],
    ["Going too deep", "Very deep dips stretch the front of the shoulder.", "Lower until the elbows are about 90°."]] },
  "sissy-squat": { s: ["Hold a solid support and start with a small range; this movement places high load on the knees.", "Skip it if it causes knee pain."], m: [
    ["Bending at the hips into a normal squat", "Hinging at the hips turns it into a regular squat.", "Keep a straight line from knees to shoulders as you lean back."],
    ["Pulling yourself up with the arm", "The arm does work the quads should do.", "Use the support only for balance; reduce the range."],
    ["Dropping too low too soon", "A sudden deep position overloads the knees.", "Build range gradually over sessions."]] },
  "wall-sit": { s: ["Use a non-slip floor and a smooth wall.", "Hold only as long as you can keep the position."], m: [
    ["Sitting too high so the thighs never reach level", "A high position makes the hold easier and trains less of the range.", "Slide down until the thighs are about parallel to the floor."],
    ["Feet too close so the knees pass the toes", "Close feet push the knees forward.", "Move the feet out so the shins are near vertical."],
    ["Pushing the hands on the thighs", "The hands support part of the load.", "Keep the hands off the legs."]] },
  "stiff-leg-deadlift": { s: ["Use a light load: the legs stay nearly straight, which makes this a demanding stretch for the hamstrings and back.", "Stop where you can keep a neutral back."], m: [
    ["Rounding the back to reach lower", "Rounding moves load onto the lower back.", "Keep the back flat and stop when the hamstrings limit you."],
    ["Bending the knees into a conventional deadlift", "Bending the knees changes the exercise.", "Keep only a slight, fixed knee bend."],
    ["Letting the bar drift away from the legs", "A distant bar loads the lower back.", "Keep the bar close to the legs."]] },
  "seated-leg-curl": { s: ["Set the thigh pad snug and the knees in line with the pivot.", "Lower slowly."], m: [
    ["Leaning forward off the back pad", "Leaning changes the hamstrings' stretch.", "Sit back against the pad."],
    ["Lifting the hips to finish the curl", "Lifting the hips lets the body help.", "Keep the hips down under the thigh pad."],
    ["Letting the weights slam down", "Dropping skips the controlled lowering.", "Return slowly."]] },
  "single-leg-romanian-deadlift": { s: ["Start without weight, near a support, until the balance is steady.", "Stop where you can keep the back neutral and the hips square."], m: [
    ["Rounding the back to reach the floor", "Rounding moves the work to the lower back.", "Keep a flat back and stop where the hamstring limits you."],
    ["Hips opening toward the free leg", "An open hip reduces the stretch and makes balance harder.", "Keep the hips square to the floor."],
    ["Bending the standing knee into a squat", "Bending the knee turns it into a squat.", "Keep a slight, fixed knee bend."]] },
  "good-morning": { s: ["Start very light: the load sits on the back while the torso hinges forward.", "Use a rack with safety arms."], m: [
    ["Bending the knees into a squat", "Squatting changes the exercise and reduces hamstring work.", "Keep a slight, fixed knee bend and push the hips back."],
    ["Rounding the lower back at the bottom", "Rounding under the bar loads the lower back.", "Keep the back flat and stop when the hamstrings limit you."],
    ["Going too heavy", "Heavy loads make it hard to keep a neutral back.", "Use a light load and controlled reps."]] },
  "nordic-hamstring-curl": { s: ["Anchor the ankles securely and pad the knees.", "Use hands to catch yourself; reduce the range until you can control it."], m: [
    ["Bending at the hips to shorten the lever", "Hinging takes load off the hamstrings.", "Keep a straight line from knees to shoulders."],
    ["Dropping fast after the first few degrees", "A fast fall loses the controlled lowering that matters most.", "Lower as slowly as you can, using a band for help."],
    ["Pushing hard off the floor", "The arms do most of the return.", "Use the hands only as needed."]] },
  "leg-press-calf-raise": { s: ["Keep the safety stops engaged and the knees soft, not locked.", "Keep the balls of the feet on the platform edge."], m: [
    ["Bending the knees to push the plate", "Bending the knees lets the quads help.", "Keep the knees straight but not locked."],
    ["Bouncing out of the stretch", "Bouncing uses tendon rebound.", "Pause at the bottom."],
    ["Feet slipping too high on the plate", "A slipping foot is unstable.", "Keep the balls of the feet on the lower edge."]] },
  "single-leg-calf-raise": { s: ["Hold a post for balance.", "Move slowly through a full range."], m: [
    ["Bending the knee and bouncing", "Bending and bouncing reduce calf work.", "Keep the knee straight and pause at the bottom."],
    ["Rolling onto the outside of the foot", "Rolling out loads the ankle unevenly.", "Push through the base of the big toe."],
    ["Pulling up with the arm", "The arm does part of the work.", "Use the support only for balance."]] },
  "hanging-knee-raise": { s: ["Start from a still hang with a secure grip.", "Lower the legs slowly."], m: [
    ["Swinging the body for momentum", "Momentum lifts the legs instead of the abs.", "Pause in a still hang between reps."],
    ["Stopping with the knees below the hips", "A short raise skips the pelvis curl.", "Raise the knees to at least hip height."],
    ["Dropping the legs fast", "Dropping starts a swing.", "Lower slowly."]] },
  "bicycle-crunch": { s: ["Keep the hands light on the head.", "Move slowly."], m: [
    ["Pulling on the neck with the hands", "Pulling strains the neck.", "Rest the fingertips lightly on the head."],
    ["Flapping the elbows without turning the trunk", "Moving only the elbows means the trunk is not rotating.", "Turn the shoulder toward the opposite knee."],
    ["Rushing the reps", "Speed replaces control.", "Pause briefly on each side."]] },
  "reverse-crunch": { s: ["Keep the movement small and controlled.", "Rest the arms flat on the floor."], m: [
    ["Swinging the legs to throw the hips up", "Swinging uses momentum.", "Curl the pelvis up slowly."],
    ["Pushing hard with the hands", "The arms help lift the hips.", "Keep the hands relaxed on the floor."],
    ["Letting the legs drop between reps", "Dropping skips the controlled lowering.", "Lower slowly."]] },
  "bird-dog": { s: ["Kneel on a mat with the hands under the shoulders and knees under the hips.", "Move slowly."], m: [
    ["Arching the lower back as the leg lifts", "Arching means the core has lost control of the spine.", "Lift the leg only to hip height."],
    ["Hips rotating toward the lifted leg", "Rotation means the trunk is not stable.", "Keep the hips level."],
    ["Rushing the reach", "Speed replaces control.", "Reach and hold for a moment."]] },
  "bodyweight-squat": { s: ["Squat to a depth you can control with a neutral back.", "Hold a support if needed for balance."], m: [
    ["Knees caving inward", "Caving knees load the knee out of line.", "Push the knees out over the toes."],
    ["Heels lifting", "Lifting the heels reduces balance.", "Keep the whole foot down."],
    ["Cutting the depth short", "Shallow reps train less range.", "Lower until the hips are about knee height."]] },
  "jump-squat": { s: ["Land softly with bent knees, on a forgiving surface.", "Skip jumping if it causes knee or back pain."], m: [
    ["Knees caving in on the landing", "Caving knees on landing load the knee out of line.", "Land with the knees over the toes."],
    ["Landing stiff-legged", "Stiff landings transmit impact to the joints.", "Bend the knees and hips to absorb the landing."],
    ["Rushing reps without resetting", "Rushing reduces landing control.", "Pause and reset between jumps."]] },
  "burpee": { s: ["Start with a step-back version and add the jump once controlled.", "Use a non-slip floor."], m: [
    ["Hips sagging in the plank", "Sagging arches the lower back.", "Hold a straight line in the plank."],
    ["Lower back rounding as you squat down", "Rounding loads the back.", "Squat down with a flat back."],
    ["Landing heavily on the hands", "A hard landing jars the wrists and shoulders.", "Lower the hands to the floor under control."]] },
  "mountain-climber": { s: ["Keep the hands under the shoulders.", "Slow down to keep the hips level."], m: [
    ["Hips piking up high", "Piked hips reduce core work.", "Keep a straight line from shoulders to heels."],
    ["Shoulders drifting behind the hands", "Drifting back changes the plank position.", "Keep the shoulders over the hands."],
    ["Short, bouncing steps", "Short steps reduce the range.", "Bring each knee toward the chest."]] },
  "kettlebell-swing": { s: ["Learn the hip hinge first; the swing is driven by the hips, not the arms.", "Swing in a clear space."], m: [
    ["Squatting the bell down and up", "Squatting turns the swing into a front raise with a squat.", "Hinge at the hips with only a slight knee bend."],
    ["Lifting the bell with the shoulders", "The shoulders do work that the hips should do.", "Drive the hips forward and let the arms float."],
    ["Leaning back at the top", "Leaning back over-extends the lower back.", "Finish standing tall with the glutes squeezed."]] },
  "farmer-s-carry": { s: ["Pick up and set down the weights with a flat back.", "Walk in a clear path."], m: [
    ["Rounding forward under the load", "Rounding loads the back.", "Stand tall with the shoulders back."],
    ["Leaning to one side", "Leaning means the trunk is not holding the load evenly.", "Keep the torso upright."],
    ["Long, swaying strides", "Long strides make the load swing.", "Take short, controlled steps."]] },
  "battle-rope": { s: ["Keep a slight squat and a braced trunk.", "Stop when the waves become uncontrolled."], m: [
    ["Standing straight up with locked knees", "Locked knees transfer the shock to the back.", "Keep a slight squat stance."],
    ["Tiny waves from the wrists only", "Small waves miss most of the body's work.", "Move the arms from the shoulders."],
    ["Rounding the back", "Rounding loads the back.", "Keep the chest up."]] },
  "box-jump": { s: ["Use a stable box at a height you can land on comfortably.", "Step down rather than jumping down."], m: [
    ["Landing with the knees caving in", "Caving knees load the knee out of line.", "Land with the knees over the toes."],
    ["Landing on the toes at the box edge", "Landing on the edge risks slipping.", "Land with the whole foot on the box."],
    ["Jumping back down off the box", "Jumping down increases landing stress.", "Step down one foot at a time."]] },
  "sled-push": { s: ["Use a clear lane and a sled weight you can push steadily.", "Keep the arms extended and the back flat."], m: [
    ["Standing too upright", "An upright stance reduces leg drive.", "Lean into the sled with the body in a line."],
    ["Rounding the back over the poles", "Rounding loads the back.", "Keep a flat back."],
    ["Long, slow strides", "Long strides lose power.", "Take short, powerful steps."]] },
  "sled-pull": { s: ["Use a clear lane and a manageable weight.", "Keep the back flat."], m: [
    ["Pulling with bent arms", "Bent arms make the arms tire first.", "Keep the arms straight and drive with the legs."],
    ["Standing tall with straight legs", "Straight legs reduce leg drive.", "Sit back slightly and drive with the legs."],
    ["Rounding the upper back", "Rounding loads the back.", "Keep the chest up."]] },
  "band-biceps-curl": { s: ["Check the band for damage and anchor it securely under the feet.", "Lower slowly."], m: [
    ["Elbows drifting forward", "The front delts help.", "Keep the elbows at the sides."],
    ["Letting the band yank the hands down", "Uncontrolled return loses work.", "Lower slowly."],
    ["Half reps that never straighten the arm", "Short reps skip the bottom range.", "Straighten the arms fully."]] },
  "band-triceps-pushdown": { s: ["Anchor the band securely at a high point.", "Return slowly."], m: [
    ["Elbows drifting forward and up", "The shoulders help.", "Keep the elbows at the sides."],
    ["Leaning over the handles", "Body weight helps.", "Stand tall."],
    ["Short lockout", "Short reps skip full triceps contraction.", "Straighten the arms fully."]] },
  "band-pull-apart": { s: ["Use a light band and check it for damage.", "Keep the movement smooth."], m: [
    ["Shrugging the shoulders up", "Shrugging brings in the upper traps.", "Keep the shoulders down."],
    ["Bending the elbows to make it easier", "Bending the elbows reduces the rear delt and upper back work.", "Keep the arms straight."],
    ["Arching the lower back", "Arching compensates for the pull.", "Keep the ribs down."]] }
};
