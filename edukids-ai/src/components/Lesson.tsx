import { useState, useEffect } from 'react';


interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

interface Quiz {
  questions: Question[];
}

const Lesson = () => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQuiz = async () => {
      setLoading(true);
      setError(null); // Clear any previous errors
      try {
        // Replace with your actual AI prompt and API call
        const response = await fetch('/api/generateQuiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'Generate a quiz about the solar system for kids aged 6-8.',
          }),
        });
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to fetch quiz: ${response.status} - ${errorData || 'Unknown error'}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Failed to parse quiz: Expected JSON but received ${contentType}`);
        }

        const data = await response.json();
        setQuiz(data);
      } catch (err: any) {
        console.error('Error generating quiz:', err);
        setError(err.message || 'Failed to load lesson.');
      } finally {
        setLoading(false);
      }
    };

    generateQuiz();
  }, []);

  if (loading) {
    return <div>Loading lesson...</div>;
  }

  if (error) {
    return <div>Error loading lesson: {error}</div>;
  }

  if (!quiz) {
    return <div>Error loading lesson.</div>;
  }

  return (
    <div>
      <h2>Lesson Title</h2>
      <p>Lesson content goes here...</p>

      <h3>Quiz</h3>
      {quiz.questions.map((question, index) => (
        <div key={index}>
          <p>{question.question}</p>
          <ul>
            {question.options.map((option, optionIndex) => (
              <li key={optionIndex}>{option}</li>
            ))}
          </ul>
          <p>Correct Answer: {question.correct_answer}</p>
          <p>Explanation: {question.explanation}</p>
        </div>
      ))}
    </div>
  );
};

export default Lesson;
