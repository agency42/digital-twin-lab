# Experiment to Evaluate LLM-Based Personality Simulation

## Introduction  
Creating a *digital twin* – an AI agent that mimics a specific user’s personality – requires verifying that the twin’s behavior aligns with the user’s real personality traits. In this experiment, we focus on the Big Five (OCEAN) traits: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism. The user will provide personal text (e.g. writing samples or interview transcripts), from which we derive a personality profile. We then prompt a Large Language Model (LLM) to **simulate the user** when answering a standardized Big Five questionnaire. The core question is: *How accurately can the LLM-based twin’s trait scores match the user’s actual trait scores?* To answer this, our one-off experiment will have the user take a validated Big Five assessment for ground truth, and have the LLM-twin answer the same questions using only the profile from the user’s content. We aim for maximum alignment across all five traits under consistent prompting conditions. Below, we discuss best practices from research for each aspect of this design, followed by a detailed experimental procedure.

## Selecting a Big Five Assessment Instrument  
Choosing an appropriate Big Five inventory is crucial. We need a **validated** measure that balances brevity with reliability. Three common instruments are: 

- **Ten-Item Personality Inventory (TIPI)** – a very short 10-item scale (2 items per trait). It was designed for situations where longer tests are impractical ([
            The Ten-Item Personality Inventory (TIPI): a scoping review of versions, translations and psychometric properties - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC10330951/#:~:text=The%20Ten,translated%20into%20several%20different%20languages)). TIPI is quick but sacrifices some psychometric depth. It demonstrates adequate convergence with longer measures and acceptable test–retest reliability ([A Comparison of the Validity of Very Brief Measures of the Big Five ...](https://journals.sagepub.com/doi/10.1177/1073191120939160?icid=int.sj-full-text.similar-articles.3#:~:text=,patterns%20of%20relations%20with)), but internal consistency is low due to having only two items per factor. In other words, TIPI can capture broad traits but may miss nuance and subtle differences because of its brevity. This makes it less sensitive for fine-grained alignment evaluation.

- **IPIP Big Five Questionnaires** – a family of instruments from the International Personality Item Pool. These are open-source and vary in length (e.g. 50-item IPIP, 100-item, 120-item IPIP-NEO). Longer IPIP forms provide more reliable trait estimates. For example, Sorokovikova et al. (2024) used the **IPIP-NEO-120**, a 120-item questionnaire, to assess LLM “personalities” ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=In%20our%20study%2C%20we%20employed,others%E2%80%99%2C%20accurately%20depicts%20the%20respondent)). The IPIP-120 covers facets of each trait, giving a comprehensive profile. Such detail can improve alignment measurement (by reducing measurement error), but at the cost of more questions. In a one-off lab setting, a 100+ item survey might be feasible for motivated participants, though it’s time-consuming.

- **Big Five Inventory-2 (BFI-2)** – a 60-item refined version of the well-known BFI ([Frontiers | The Norwegian Adaptation of the Big Five Inventory-2](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.858920/full#:~:text=Srivastava%2C%201999,2)) ([Frontiers | The Norwegian Adaptation of the Big Five Inventory-2](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.858920/full#:~:text=thorough%20description%2C%20see%20Soto%20and,level)). BFI-2 is **freely available for research** and provides reliable, valid scores across languages ([Frontiers | The Norwegian Adaptation of the Big Five Inventory-2](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.858920/full#:~:text=Overall%2C%20the%20results%20suggest%20that,provide%20reliable%20and%20valid%20scores)) ([Frontiers | The Norwegian Adaptation of the Big Five Inventory-2](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.858920/full#:~:text=Srivastava%2C%201999,2)). It assesses each Big Five domain with 12 items (and even sub-facets, though scoring at the domain level is straightforward). BFI-2 is a strong candidate because it is shorter than IPIP-120 but still psychometrically robust. Shorter forms like BFI-2-S (30 items) or BFI-2-XS (15 items) exist with acceptable validity ([(PDF) Short and extra-short forms of the Big Five Inventory–2](https://www.researchgate.net/publication/314015515_Short_and_extra-short_forms_of_the_Big_Five_Inventory-2_The_BFI-2-S_and_BFI-2-XS#:~:text=Inventory%E2%80%932%20www,full%20measure%27s%20reliability%20and%20validity)), but the full 60-item version offers better reliability.

**Recommendation – Use a mid-length validated instrument (e.g. BFI-2 or a 50-item IPIP):** For this experiment, the Big Five Inventory-2 is an excellent choice given its balance of thoroughness and efficiency. Its items are well-validated, and the inventory has been updated to improve clarity and psychometric properties ([Frontiers | The Norwegian Adaptation of the Big Five Inventory-2](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.858920/full#:~:text=Compared%20to%20the%20original%20BFI%2C,level)). Using BFI-2 (60 items) ensures we get a solid ground-truth measure of the user’s traits without overburdening them. If an open-license is preferred, an IPIP 50-item Big Five questionnaire (which has 10 items per trait) could be used as an alternative, since it’s also widely validated and would yield reliable trait scores. In contrast, the TIPI (10 items) is likely too coarse for evaluating subtle alignment – minor discrepancies might be masked or exaggerated by the TIPI’s brevity. Thus, a standard-length inventory like BFI-2 provides the **most appropriate balance** for an LLM simulation evaluation, ensuring each trait is measured with enough items to enable meaningful comparison.

## LLM Performance on Personality Self-Assessments  
Recent research shows that LLMs *can* effectively complete personality questionnaires and even simulate different personality profiles when instructed. Key findings include:

- **LLMs can produce consistent Big Five responses:** ChatGPT/GPT-4, when prompted to **“take” a personality test as a given persona, yields results that align with known human patterns.** For example, in one study GPT-4 generated 2,000 fictional personas and answered the BFI-10 (a short Big Five test) for each. The average AI-generated trait scores closely matched published human norms, and a principal component analysis of the AI responses recovered a clear five-factor structure ([The use of ChatGPT for personality research: Administering questionnaires using generated personas](https://research.tudelft.nl/files/210486832/1-s2.0-S0191886924001892-main.pdf#:~:text=what%20extent%20these%20models%20can,component%20structure.%20Certain%20relationships)) ([The use of ChatGPT for personality research: Administering questionnaires using generated personas](https://research.tudelft.nl/files/210486832/1-s2.0-S0191886924001892-main.pdf#:~:text=correlations%20diverged%20from%20the%20literature,Introduction)). This means GPT-4’s answers were not random – they reflected realistic trait variations. Essentially, the language model understood the questionnaire items and was able to respond in a manner consistent with distinct personality profiles.

- **Reliability of LLM’s self-assessment:** LLMs tend to have **high internal consistency** in their questionnaire responses. One study found that GPT-4’s simulated responses showed *higher Cronbach’s alpha* (internal reliability) than even human respondents ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)). This suggests the model is very self-consistent when role-playing a personality – likely because it doesn’t get tired or careless and applies the persona traits uniformly. That same study also reported *“remarkably high convergent validity”* between GPT-4’s emulated trait scores and the real individuals’ self-reported scores ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)). In other words, when GPT-4 was asked to role-play actual people (given information about those people), the Big Five scores it produced were very close to those people’s real scores – a promising sign for our digital twin approach.

- **Influence of prompting on expressed traits:** Researchers have demonstrated that providing trait-specific context in prompts can steer an LLM to display a desired personality profile. Jiang et al. (2023) introduced *“personality prompting”* to induce target trait levels, significantly shifting models’ Big Five scores in the prompt’s direction ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=et%C2%A0al,of%20the%20targeted%20Big5%20traits)). For instance, adding a brief persona description like *“You are very outgoing and sociable”* before asking the questions can make the model answer as a high-extraversion individual. This indicates we can reliably control an LLM’s personality portrayal via the prompt. Our experiment will leverage this by including the user’s profile in the prompt to fix the twin’s personality.

- **Stability across minor prompt variations:** Sorokovikova et al. (2024) found that LLMs’ Big Five results were *fairly stable* even when the prompt wording or generation settings changed slightly ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=We%20add%20to%20this%20literature,generation%20parameters%20of%20the%20LLMs)). They tested GPT-4, LLaMA-2, and others with two prompt phrasing variants and different random seeds, and observed the model’s trait scores did not wildly fluctuate. This is encouraging because it suggests the twin’s simulated personality won’t be too fragile; as long as we keep a consistent prompt format (per requirement), the outputs for the questionnaire should be reproducible and not overly sensitive to minor wording tweaks.

- **Social desirability bias considerations:** One caveat from related work is that LLMs, especially without explicit instruction, might lean toward moderate or socially desirable answers on personality items. For example, a study noted that large models often display *human-like social desirability bias*, meaning they might avoid extreme or negative self-descriptions by default ([Large language models display human-like social desirability ...](https://academic.oup.com/pnasnexus/article/3/12/pgae533/7919163#:~:text=Large%20language%20models%20display%20human,understanding%20their%20biases%20is%20important)). However, since we will explicitly prompt the model to adopt *the user’s persona* (and the user’s content likely includes both strengths and weaknesses), the twin should answer in line with that profile rather than simply trying to look “good.” Ensuring the prompt emphasizes honest simulation of the user's traits will help mitigate any generic positivity bias.

In summary, LLMs (particularly GPT-4 class models) are **quite capable of taking Big Five assessments reliably and of role-playing specified personalities**. They can mirror trait profiles with surprising accuracy under proper prompts. This gives us confidence that our digital twin can faithfully simulate a user – provided we supply a high-quality personality profile from the user’s own content and keep the simulation instructions consistent.

## Metrics for Evaluating Trait Alignment  
To quantify how well the digital twin’s trait scores match the user’s actual scores, we will use several complementary statistical metrics:

- **Trait-by-Trait Correlation:** We will compute the Pearson correlation between the real and simulated scores for each of the five traits across all participants. A high correlation (close to +1) for a trait indicates that individuals who are higher on that trait in reality also tend to be rated higher by the AI twin, preserving rank-order. High correlations across all five traits would demonstrate strong *convergent validity* of the simulation ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)). For example, if the correlation for Extraversion is 0.9+, the twin is accurately distinguishing extraverts from introverts in line with ground truth. We expect strong correlations if the twin is capturing individual differences correctly.

- **Mean Difference and RMSE:** We will examine if there are any systematic biases in the twin’s scores. This involves comparing the **means** of human vs. AI trait scores and computing the **Root Mean Square Error (RMSE)** or Mean Absolute Error for each trait. RMSE (or MAE) gives an average size of the error in trait scoring. If the twin tends to be, say, a bit lower on Neuroticism for everyone, that would show up as a non-zero mean difference (bias). Ideally, we want minimal mean bias and low RMSE for each trait – meaning the twin’s score for each person is very close to the actual. These error metrics complement correlation: correlation could be high (correct ranking) even if the AI’s scores are all shifted up or down by a constant, so checking differences ensures we also capture *absolute agreement*.

- **Profile Similarity (Cosine Similarity):** We can treat each person’s Big Five scores as a 5-dimensional vector and measure the cosine similarity between the user’s vector and their AI twin’s vector. Cosine similarity close to 1 indicates the twin’s overall personality profile points in the same “direction” as the user’s profile. This is a holistic measure – even if one trait is slightly off, the overall pattern might still be aligned. If needed, we could compute an average cosine similarity across all participants. This approach has been used in prior studies to compare personality profiles as whole units (though we’ll interpret it alongside more transparent metrics like correlation and RMSE).

- **Exact Agreement on Items (Percentage Match):** Since the LLM will answer each questionnaire item on a Likert scale, we can also calculate the percentage of items where the AI’s response exactly matches the user’s self-rated response. A recent large-scale *“digital twin”* study by Stanford researchers found that AI agents’ answers matched **85%** of the humans’ answers across a battery of survey questions (including Big Five items) ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=Responses%20to%20common%20social%20science,of%20Washington%20and%20Google%20DeepMind)) ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=from%20General%20Social%20Survey%2C%20Big,with%20those%20the%20humans%20gave)). That 85% exact-match rate is remarkably high; it provides a benchmark for our expectations. We will report the overall item-level agreement percentage for the Big Five questionnaire. High item agreement suggests the twin often picks the same options (e.g. “Agree” or “Disagree”) as the user did, which is a very concrete indicator of alignment.

- **Intraclass Correlation (ICC):** As an additional statistical gauge, we may compute the intraclass correlation coefficient for each trait between the human and AI ratings. ICC (particularly a two-way mixed effects model for single measurements, ICC(3,1)) will treat each pair of human–AI scores as measurements of the same target (the person’s true trait) and assess absolute agreement. This is a stringent test – an ICC above 0.75 or 0.8 would indicate excellent agreement in absolute terms, not just relative ranking.

Using multiple metrics ensures a comprehensive evaluation. For instance, we might find that correlation is very high (the twin can rank people correctly on a trait) but RMSE reveals a slight systematic offset (the twin might under-estimate Neuroticism by a few points on average). By reporting both, we capture that nuance. Our goal is **maximum alignment**, so we hope to see high correlations (approaching 0.9–1.0), low RMSE, high cosine similarity, and high item agreement. Discrepancies will be analyzed per trait – it’s possible the twin nails some traits better than others, which itself would be an insightful result about LLM simulation strengths/weaknesses.

## Validating Trait Alignment from Generated Language  
Beyond the structured questionnaire responses, we can further validate the twin’s personality alignment by analyzing its *natural language outputs*. This checks that the twin not only answers multiple-choice questions like the user, but also **talks or writes in a manner consistent with the user’s personality.** We will use a couple of techniques:

- **Open-Ended Prompts for Twin and User:** We can have both the user and the AI twin respond to some identical open-ended questions or scenarios to generate free-form text. For example, we might ask, “Describe how you typically spend your weekend” or present a hypothetical social situation and ask how they’d react. The user would write a response (ground truth style sample), and the AI twin – using the personality profile only – would generate a response as it thinks the user would. This yields two texts that we can compare for personality markers.

- **Linguistic Analysis for Personality Cues:** We will analyze the texts for known linguistic correlates of Big Five traits. Prior research in computational psycholinguistics has identified subtle but meaningful language patterns associated with personality. For instance, extraversion is positively correlated with the use of **social words** (e.g. mentions of friends, social activities) and **positive emotion words** ([A meta-analysis of linguistic markers of extraversion: Positive ...](https://www.sciencedirect.com/science/article/abs/pii/S0092656620301240#:~:text=...%20www.sciencedirect.com%20%20Our%20meta,069)). Neuroticism, on the other hand, often correlates with higher usage of negative emotion words and first-person singular pronouns (reflecting inward focus). We can use a tool like Linguistic Inquiry and Word Count (LIWC) or similar text analysis to extract such features. If the user is an extravert and frequently uses enthusiastic, social language, we should see the twin’s text also contain relatively higher social and positive emotion word counts, whereas a misaligned twin might use a flatter or more introverted style. By quantitatively comparing these linguistic features, we validate whether the twin’s writing **echoes the user's trait-driven style**. Even small correlations (r ~0.06-0.07 in meta-analyses for single markers) are expected ([A meta-analysis of linguistic markers of extraversion: Positive ...](https://www.sciencedirect.com/science/article/abs/pii/S0092656620301240#:~:text=...%20www.sciencedirect.com%20%20Our%20meta,069)), so we’ll look at the overall pattern across many markers.

- **Automated Personality Prediction from Text:** Another approach is to apply a pretrained personality prediction model to the texts. Researchers have trained machine learning models on large datasets (e.g. essays, social media posts) to predict Big Five traits from language. We could feed both the user’s and twin’s responses into such a model to get an independent trait estimate from the text. If the twin is accurate, the model should output a similar trait profile for both. For example, if a BERT-based personality predictor rates the user’s text as high Agreeableness and low Neuroticism, it should rate the twin’s text in the same direction. High agreement here would reinforce that the twin isn’t just picking the right multiple-choice answers, but truly *embodying* the personality in its spontaneous expression.

- **Human Judge Evaluation (optional):** For a qualitative check, we could recruit independent judges (blind to whose text is whose) to read a pair of responses (one from the user, one from the twin) and guess if they were written by the same personality or not. If judges frequently feel they could be the same person, that qualitatively supports alignment. However, this is optional and may be beyond the scope of the core experiment, which primarily relies on quantitative measures.

By validating through natural language generation, we address the question: does the AI twin *sound* like the user in personality? A well-aligned twin should consistently reflect the user's openness (e.g. using imaginative language if user is high Openness), conscientiousness (organized vs. spontaneous tone), extraversion (enthusiastic vs. reserved wording), agreeableness (friendly and polite phrasing), and neuroticism (anxious vs. calm expressions) in free responses. These checks ensure our evaluation isn’t narrowly tied to the questionnaire format alone, but extends to the twin’s general behavior.

## Emerging Research on Simulated Personalities  
The idea of evaluating AI-simulated personalities with psychometric tools is **cutting-edge**, and a small but growing body of literature offers guidance:

- A 2024 study by **de Winter et al.** demonstrated that using GPT-4 to generate personas and fill out personality questionnaires can yield realistic data ([The use of ChatGPT for personality research: Administering questionnaires using generated personas](https://research.tudelft.nl/files/210486832/1-s2.0-S0191886924001892-main.pdf#:~:text=what%20extent%20these%20models%20can,component%20structure.%20Certain%20relationships)) ([The use of ChatGPT for personality research: Administering questionnaires using generated personas](https://research.tudelft.nl/files/210486832/1-s2.0-S0191886924001892-main.pdf#:~:text=correlations%20diverged%20from%20the%20literature,Introduction)). They showed LLM-generated responses on the BFI-10 aligned with known human data, supporting the validity of LLM “participants.” This suggests that using an LLM to simulate a real person’s questionnaire responses (as in our experiment) is methodologically sound.

- **Sorokovikova et al. (2024) ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=In%20our%20study%2C%20we%20employed,others%E2%80%99%2C%20accurately%20depicts%20the%20respondent))** and **Serapio-García et al. (2023) ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=generated%20by%20a%20person%20with,to%20induce%20certain%20personality%20traits))** pioneered methods for administering Big Five tests to language models. They confirmed that different models exhibit different trait profiles and that these can be modulated via prompts. This underscores the importance of a fixed, well-crafted prompt when we want a stable simulation of a specific personality.

- **Jiang et al. (2023) ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=Jiang%20et%C2%A0al,of%20the%20targeted%20Big5%20traits))** introduced *Personality Prompting* to systematically induce certain Big Five trait levels in pretrained models. Their success in guiding models’ trait outputs provides a template for our simulation prompt design (ensuring the twin actually expresses the user’s traits strongly).

- A very recent 2024 experiment by **Xu et al.** evaluated GPT-4’s ability to emulate real individuals’ personalities (very similar in spirit to our goal). They found extremely high agreement between GPT-4’s emulated Big Five scores and the individuals’ actual scores, and noted the AI’s responses had even *higher internal consistency* than human responses ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)). This is an encouraging precedent: it shows that with the right input information, GPT-4 can act as a *convincing personality mirror*. They also observed that adding more background info (like demographics or life history) can further improve fidelity in some traits ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=profiles,validity%20of%20emulated%20personality%20scores)), which suggests that providing rich personal content from the user will help our twin’s accuracy.

- Perhaps the most impressive is the **Stanford-led “Digital Twin” study** (2024) where researchers created AI agents based on *two-hour interviews* with real people. These agents answered a variety of survey questions (including the Big Five Inventory) and even participated in social dilemmas. The outcome: the AI agents’ answers matched **~85%** of the human answers, trait for trait ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=Responses%20to%20common%20social%20science,of%20Washington%20and%20Google%20DeepMind)) ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=from%20General%20Social%20Survey%2C%20Big,with%20those%20the%20humans%20gave)). Such high fidelity was achieved by feeding the extensive interview data into the LLM’s prompt (enabled by long context windows) and keeping the agent’s prompt architecture fixed. This study provides a real-world validation that an LLM-based twin can closely mimic a person’s responses on psychometric instruments when given sufficient personal data. Our experiment will emulate this approach on a smaller scale (using written content instead of a full interview, and focusing specifically on the Big Five test).

In summary, emerging literature strongly supports the viability of our experiment. Prior studies have shown that LLMs can simulate questionnaire responses with realistic trait patterns and that, when anchored with real human data, they can achieve a high degree of accuracy in reflecting an individual’s personality. These works guide our best practices: use validated tools, supply rich personal context, craft the prompt carefully, and evaluate with rigorous metrics.

## Experimental Design Proposal  

Based on the above insights, we propose the following experimental design to evaluate the accuracy of an LLM-based digital twin in simulating a user’s Big Five personality profile:

**1. Participants and Data Collection:** Recruit a set of users (e.g. 30–50 individuals) willing to participate. For each user, collect:  
   - **Personal Text Sample:** A substantial sample of the user’s writing or speech transcripts. This could be in the form of blog posts, diary entries, social media content, emails, or responses to an open-ended interview questionnaire. The sample should be rich and reflective of the user’s personality (aim for a few thousand words if possible, to give the LLM plenty of context). We will ensure privacy by obtaining consent and allowing users to redact any sensitive details. This text will serve as the basis for generating the personality profile.  
   - **Ground Truth Personality Test:** Have the user complete the selected Big Five instrument (BFI-2, in our recommendation). This will be done under standard, controlled conditions – e.g., an online form or paper survey with instructions as per the test manual. We will compute the user’s trait scores from their responses following the instrument’s scoring key (for BFI-2, that means averaging or summing the 12 items per trait after reverse-coding where needed). These scores (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) are our ground truth for each participant.

**2. Constructing the User’s Personality Profile:** Using the personal text, we will derive a profile of the user in terms of Big Five traits to feed to the LLM. Two complementary approaches can be combined for robustness:  
   - *LLM-based analysis:* We will prompt GPT-4 (or a similar advanced LLM) with the user’s text and ask for an analysis of the user’s personality. For example: *“Analyze the following text and infer the likely personality traits of the author in terms of the Big Five model. Provide an estimate or description of their levels of Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.”* The model might return a descriptive profile (e.g. “The author appears high in Openness (very imaginative and curious), moderate in Conscientiousness, low in Extraversion (prefers solitude), high in Agreeableness (very polite and cooperative), and moderate in Neuroticism (somewhat anxious).”). We can further ask it to quantify these (e.g. on a 1–5 or 1–100 scale for each trait) if needed.  
   - *Text-based predictive model:* In parallel, we can use a pre-trained personality prediction algorithm (for instance, one trained on the myPersonality dataset) that takes text as input and outputs Big Five scores. This would give an independent estimate of the user’s traits from their writing.  

   We will compare the outputs and distill them into a finalized **personality profile** for the user. The profile could be a set of trait scores (e.g. Openness: 8/10, Conscientiousness: 5/10, etc.) and/or a short synopsis of their personality. It’s important that this profile is **based only on the user’s content**, not on the user’s actual questionnaire answers (which remain hidden from the LLM). Essentially, this profile represents what the AI *believes* the user’s personality is, given their writing.

**3. LLM Twin Simulation:** We will prompt a large language model (ideally GPT-4, known for its capability to follow instructions and handle nuance) to take the Big Five questionnaire **as if it were the user**. The prompt will remain fixed for all questions to ensure consistency. A possible prompt design is:  

> *System message:* You are simulating the personality of **[User X]** based on the following profile:  
> **Profile:** *[include the Big Five trait summary or key points, e.g. “High Openness, Low Extraversion, etc., plus a brief description]*.  
> Answer the next question as if you are [User X], **honestly and consistently with the above personality profile**. Use the options 1–5 (Likert scale) where 1 = “Disagree Strongly” and 5 = “Agree Strongly,” with no additional text.  

We will then feed each questionnaire statement to the model (likely as user prompts one by one): e.g., *“Q1: I see myself as someone who is talkative.”* – and the model should output a single number 1–5. This procedure is repeated for all 60 items (if BFI-2). The *simulation prompt remains identical* except for the question text insertion each time, fulfilling the consistency requirement. We will use the same prompt structure for every participant’s twin (only the profile content will differ per user). The model’s temperature will be set low (to reduce randomness) so that its output is deterministic given the prompt, or we may run multiple trials and take the modal answer if small variability exists. Throughout, the twin **does not see the user’s actual answers**; it relies solely on the profile. After this, we will have the AI’s answers for the Big Five questionnaire for each user.

**4. Scoring the AI Responses:** We will score the AI’s questionnaire responses using the same scoring key as for the humans. For instance, in BFI-2, each trait score is the average of 12 specific items. We’ll apply any reverse scoring and compute the AI twin’s O, C, E, A, N scores. This yields a direct comparison: for each user, we have two profiles – one from their self-report, one from the AI twin. 

**5. Data Analysis:** Using the metrics outlined earlier, we will evaluate alignment:  
   - Compute the difference between AI and human scores for each trait per user, and summarize these differences (mean bias and standard deviation).  
   - Calculate Pearson correlations between human and AI scores across users on each of the five traits ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)). High correlations would indicate the twin accurately ranks individuals on that trait similar to their real scores.  
   - Calculate overall profile similarity per user (cosine similarity between the 5-dim vectors). Also calculate the percentage of exact item-level matches (how often the AI chose the same Likert value as the human on each question) ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=from%20General%20Social%20Survey%2C%20Big,with%20those%20the%20humans%20gave)).  
   - Perform significance tests: e.g., a paired t-test per trait to see if AI scores differ significantly from human scores on average (expectation is no significant difference if well-aligned), and perhaps an intraclass correlation analysis for each trait to assess absolute agreement.  
   - If sample size is sufficient, we can also examine trait-by-trait: maybe the twin is better at some traits than others. For example, perhaps Agreeableness has a 0.95 correlation but Openness is only 0.7 – we would explore why (maybe the user’s writing about imaginative topics was sparse, etc.).  
   - We will present results both numerically and visually (radar charts of average profiles, scatter plots of AI vs human scores per trait, etc., as needed).

**6. Validation with Natural Language Outputs:** After the questionnaire simulation, we will also conduct the free-response validation. For each participant, we’ll prompt their AI twin to produce a short essay or answer to open-ended questions (as described in the previous section), and have the participant provide their own answer to the same prompts. We will then analyze these texts for personality markers. For each user, we can compare the LIWC or other linguistic feature scores (e.g., % of social words, use of exclamation points, sentiment, etc.) between their writing and the twin’s writing. We will also apply a text-based personality predictor to see if it assigns similar trait values to both. This step is more exploratory, but it adds confidence that the twin isn’t just choosing the right Likert numbers – it’s *embodying* the persona in actual language. If discrepancies arise here (say the twin’s language seems more extraverted than the user’s despite matching on the questionnaire), that might indicate the twin oversimplified the personality, which is useful feedback for refining the profile generation process.

**7. Outcome and Interpretation:** Finally, we will interpret the findings in terms of alignment success. If the experiment is successful, we expect to report something like: “The digital twin’s trait scores correlated r = 0.9+ with the users’ actual scores on average, with an average absolute trait difference of less than 0.3 on the 5-point scale (on 1–5 Likert). The AI matched **80–85%** of individual item responses exactly with the humans ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=from%20General%20Social%20Survey%2C%20Big,with%20those%20the%20humans%20gave)). These results indicate a very high fidelity in personality simulation, consistent with recent studies of GPT-4 emulating real individuals ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)). Linguistic analysis of free responses also showed the AI twin’s language reflected the users’ trait tendencies (e.g. extraverts’ twins used more social words, agreeable individuals’ twins used warmer tone, etc.).” If there are traits with lower alignment, we will discuss why – perhaps certain traits are harder to infer from text alone (for example, Neuroticism might be harder to gauge if the user’s writing is formal/professional in tone and doesn’t reveal anxieties).

This experimental design is a **one-off assessment** for each user, focusing on a single time-point profile (we are not tracking changes over time). It leverages best practices from emerging research: using a validated psychometric tool as the benchmark, prompting the LLM with a fixed persona description, and employing multiple quantitative methods to evaluate trait agreement. By the end, we will have a clear measure of how accurately an LLM-based digital twin can mirror a user’s Big Five personality, and insights into any gaps or improvements needed for future iterations of personalized AI avatars.

## References  

- De Winter, J. C. F., et al. (2024). *The use of ChatGPT for personality research: Administering questionnaires using generated personas.* **Personality and Individual Differences, 228,** 112729. (Demonstrated that GPT-4 can generate personas and complete the BFI-10, yielding trait distributions and factor structure comparable to human data) ([The use of ChatGPT for personality research: Administering questionnaires using generated personas](https://research.tudelft.nl/files/210486832/1-s2.0-S0191886924001892-main.pdf#:~:text=what%20extent%20these%20models%20can,component%20structure.%20Certain%20relationships)) ([The use of ChatGPT for personality research: Administering questionnaires using generated personas](https://research.tudelft.nl/files/210486832/1-s2.0-S0191886924001892-main.pdf#:~:text=correlations%20diverged%20from%20the%20literature,Introduction)).

- Sorokovikova, A., et al. (2024). *LLMs Simulate Big Five Personality Traits: Further Evidence.* arXiv preprint arXiv:2402.01765. (Administered the 120-item IPIP-NEO to GPT-4, Llama2, etc., showing models have distinct Big Five profiles; prompting “as a person” and varying parameters had minimal effect on overall trait scores) ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=In%20our%20study%2C%20we%20employed,others%E2%80%99%2C%20accurately%20depicts%20the%20respondent)) ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=We%20add%20to%20this%20literature,generation%20parameters%20of%20the%20LLMs)).

- Jiang, G., et al. (2023). *Evaluating and inducing personality in pre-trained language models.* arXiv preprint arXiv:2206.07550. (Introduced **Personality Prompting (P²)**, finding that providing trait-related context can push an LLM’s questionnaire responses toward desired Big Five trait levels) ([[2402.01765] LLMs Simulate Big Five Personality Traits: Further Evidence](https://ar5iv.org/html/2402.01765v1#:~:text=et%C2%A0al,of%20the%20targeted%20Big5%20traits)).

- Xu, X., et al. (2025). *Evaluating the ability of large language models to emulate personality.* **Scientific Reports, 13,** 1701. (Found GPT-4 could role-play real individuals with diverse personalities with very high convergent validity to their actual Big Five scores; AI’s internal consistency was higher than humans’, indicating stable trait simulation) ([
            Evaluating the ability of large language models to emulate personality - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC11695923/#:~:text=differences,Introducing%20supplementary)).

- Park, H. et al. (2024). *AI Agents Simulate 1,052 Individuals’ Personalities with Impressive Accuracy.* Stanford HAI News. (Reported on a study where LLM-based agents, given two-hour interview data, matched about **85%** of their human counterpart’s answers on the Big Five Inventory and other surveys ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=Responses%20to%20common%20social%20science,of%20Washington%20and%20Google%20DeepMind)) ([How a 2-Hour Interview With an LLM Makes a Digital Twin](https://www.bankinfosecurity.com/how-2-hour-interview-llm-makes-digital-twin-a-26910#:~:text=from%20General%20Social%20Survey%2C%20Big,with%20those%20the%20humans%20gave)), demonstrating the potential of long-context LLMs for creating accurate digital twins).

- Gosling, S. D., et al. (2003). *A very brief measure of the Big-Five personality domains.* **Journal of Research in Personality, 37(6),** 504–528. (Introduced the TIPI; notes that the TIPI, while convenient, has lower internal consistency and is intended for situations where longer instruments can’t be used ([
            The Ten-Item Personality Inventory (TIPI): a scoping review of versions, translations and psychometric properties - PMC
        ](https://pmc.ncbi.nlm.nih.gov/articles/PMC10330951/#:~:text=The%20Ten,translated%20into%20several%20different%20languages))).

- Linguistic Markers of Extraversion (Meta-analysis). (2021). *Journal of Research in Personality, 90,* 104036. (Found that extraversion is modestly associated with more frequent use of social process words and positive emotion words in text ([A meta-analysis of linguistic markers of extraversion: Positive ...](https://www.sciencedirect.com/science/article/abs/pii/S0092656620301240#:~:text=...%20www.sciencedirect.com%20%20Our%20meta,069)), illustrating how personality traits can manifest in language – useful for validating the twin’s open-ended outputs).




###################
###################


✅ PHASE 1: MVP (TIPI-Based, Low-Friction Digital Twin Validation)
🔧 Core Feature Set:
Input:

User uploads a writing sample (e.g., pasted text, file upload, or auto-import from connected source).

User completes TIPI (Ten Item Personality Inventory) — 10 questions, Likert scale 1–7.
(~1 min effort; minimal interaction)

Digital Twin Generation:

Use pre-built prompt (LLM as Jungian analyst) to extract personality JSON from content.

Inject the JSON into a standard simulation prompt to produce a Digital Twin.

Twin takes the TIPI using only the generated personality profile.

Output & Comparison:

Trait-by-trait comparison of user vs. twin across TIPI items (1–7 scale).

Show:

Bar chart comparison of OCEAN scores.

% of exact matches across 10 questions.

Cosine similarity between trait vectors.

Optional: comment from LLM explaining perceived similarities/differences.

🧪 Evaluation Goals:
Test if even a lightweight system produces plausible fidelity.

Validate end-to-end architecture for automated twin generation + response simulation + evaluation.

Gather user feedback: “Did this feel like you?”

🛠️ Implementation Notes:
No user accounts or persistent storage required.

Static persona prompt (JSON), TIPI hardcoded as 10 static questions.

Responses rendered on the frontend; no API rate-limiting or multi-user conflict resolution needed at this stage.

Use OpenAI/GPT-4 with deterministic settings (temperature ~0).

🧱 PHASE 2: MODULARITY & REFINEMENT
🔧 Improvements:
Switch to a mid-length assessment (e.g., 30-item BFI-2-XS or IPIP-50) with optionality:

“Short test (1 min)” → TIPI

“Balanced test (5–7 min)” → BFI-2-XS

User-selectable Twin Versions:

Option to adjust prompt strength or trait amplification.

Future option: multiple twin variants generated from different slices of user content (public vs. private tone).

Confidence & Agreement Metrics:

Cosine similarity + correlation + item agreement, clearly explained.

Add AI-generated natural language explanation ("Your twin matched you on 80%, but seems slightly more extraverted...").

Minimal interaction maintained — just pick which test you want to run, no login required yet.

🌱 PHASE 3: MULTIMODAL & LONG-CONTEXT SUPPORT
🔧 Major Upgrades:
Multimodal Upload Support:

Audio transcripts, YouTube captions, tweet threads, blog URLs → vectorized and summarized to personality JSON.

AI summarizes and weights different sources for trait inference.

Rich Digital Twin Profile View:

Timeline of personality development (if timestamped data).

Sub-facet trait profiles (e.g., Agreeableness → Trust, Modesty, etc.)

Advanced Evaluation:

Run BFI-2 (60 items) and compute intraclass correlations, RMSE, etc.

Add open-ended questions to compare free-form answers from user vs. twin (semantic + stylistic similarity).

LIWC-style personality markers in free text ("Your twin matches your use of social language 93%").

Personality Drift Experiments:

See how the twin behaves in new domains (e.g., “Would you respond this way in a crisis?”).

Ask twin to take the Big Five as if it were 10 years ago — and contrast with present day twin.

🚀 PHASE 4: PRODUCTIZED PLATFORM FOR CUSTOM DIGITAL TWINS
🔧 Platform Features:
User Profile Dashboard:

See current twin profile and trait radar chart.

Run new experiments (BFI, MBTI, etc.) at any time.

Upload new data to retrain or update the profile.

Twin Persona Controls:

Trait tuning sliders (e.g., “increase confidence by 10%”).

Behavior context adjustment (e.g., “simulate me in a boardroom vs. DMs”).

Third-party Twin Evaluation / Feedback:

Let friends rate interactions with your twin for realism.

Twin could even ask them questions to test perceived alignment.

APIs for Digital Cloning Integration:

Export twin to Discord/Twitter agent.

Embeddable twin Q&A widget on website.

