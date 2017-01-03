<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * widget block caps.
 *
 * @package    block_widget
 * @copyright  Daniel Neis <danielneis@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();


class block_widget extends block_base
{
    public function init()
    {
        $this->title = 'Predictions';
    }

    public function percentageOfAssignmentsCompleted($user, $course)
    {
        global $DB;
        $assign_completed = $DB->count_records_sql('SELECT count(*)
                                    FROM mdl_assign ma, mdl_assign_submission ms
                                    WHERE ma.id = ms.assignment
                                    AND ma.course = ?
                                    AND ms.userid = ?
                                    AND ms.status = "submitted"', array($course, $user)) ;

        $assign_total = $DB->count_records_sql('SELECT count(*)
                                    FROM mdl_assign ma
                                    WHERE ma.course = ?', array($course));

        return intval($assign_completed) * 100/ intval($assign_total);
    }

    public function percentageOfOpenedDiscussion($user, $course)
    {
        global $DB;
        $student_open_discussions = $DB->count_records_sql('select COUNT(*)
                                                          FROM mdl_forum_discussions fd, mdl_forum_posts fp
                                                          WHERE fd.id = fp.discussion
                                                          AND fd.course = ?
                                                          AND fd.userid = ?
                                                          AND fp.parent = 0', array($course, $user)) ;

        $open_discussion_total = $DB->count_records_sql('SELECT count(*)
                                            FROM mdl_forum_discussions fd, mdl_forum_posts fp
                                            WHERE fd.id = fp.discussion
                                            AND fd.course = ?
                                          AND fp.parent = 0', array($course)) ;

        return    intval($student_open_discussions) * 100/ intval($open_discussion_total);
    }

    public function percentageOfWikiEntries($user, $course)
    {
        global $DB;
        $wiki_completed = $DB->count_records_sql('SELECT count(distinct mw.id)
                                              FROM mdl_wiki mw, mdl_wiki_versions mwv
                                              WHERE mw.id = mwv.pageid
                                              and mw.course = ?
                                              and mwv.userid = ?', array($course, $user)) ;

        $wiki_total = $DB->count_records_sql('SELECT count(*)
                                    FROM mdl_wiki mw
                                    WHERE mw.course = ?', array($course)) ;
        return intval($wiki_completed) * 100/ intval($wiki_total);
    }

    public function percentageOfReplies($user, $course)
    {
        global $DB;
        $student_reply_discussions = $DB->count_records_sql('select COUNT(*)
                                                          FROM mdl_forum_discussions fd, mdl_forum_posts fp
                                                          WHERE fd.id = fp.discussion
                                                          AND fd.course = ?
                                                          AND fd.userid = ?
                                                          AND fp.parent != 0', array($course, $user)) ;

        $reply_discussion_total = $DB->count_records_sql('SELECT count(*)
                                            FROM mdl_forum_discussions fd, mdl_forum_posts fp
                                            WHERE fd.id = fp.discussion
                                            AND fd.course = ?
                                          AND fp.parent != 0', array($course)) ;
        return intval($student_reply_discussions) * 100/ intval($reply_discussion_total);
    }

    public function percentageOfVisitOfStudent($user, $course)
    {
        global $DB;
        $student_visits = $DB->count_records_sql('select COUNT(*)
                                                          FROM mdl_logstore_standard_log
                                                          WHERE courseid = ?
                                                          AND userid = ?
                                                          AND action = "viewed"
                                                          AND timecreated < (SELECT (startdate + (60*60*24*7*16))
                                                                             FROM mdl_course
                                                                             WHERE id = 2) ', array($course, $user)) ;

        $total_visits = $DB->count_records_sql('select COUNT(*)
                                                      FROM mdl_logstore_standard_log
                                                      WHERE courseid = ?
                                                      AND action = "viewed"
                                                      AND timecreated < (SELECT (startdate + (60*60*24*7*16))
                                                                         FROM mdl_course
                                                                         WHERE id = 2)', array($course)) ;
        return intval($student_visits) * 100/ intval($total_visits);
    }

    public function percentagOfAccessedResource($user, $course)
    {
        global $DB;
        $student_accessed_resources = $DB->count_records_sql('select COUNT(distinct objectid)
                                                  FROM mdl_logstore_standard_log
                                                  WHERE courseid = ?
                                                  AND userid = ?
                                                  AND action = "viewed"
                                                  AND objecttable = "resource"
                                                  AND timecreated < (SELECT (startdate + (60*60*24*7*16))
                                                                     FROM mdl_course
                                                                     WHERE id = 2) ', array($course, $user)) ;

        $total_resources = $DB->count_records_sql('select COUNT(*)
                                                  FROM mdl_resource
                                                  WHERE course = ?', array($course)) ;

        return  intval($student_accessed_resources) * 100/ intval($total_resources);
    }

    public function getCluster($user, $course)
    {
        global $DB;
        $score = $DB->count_records_sql('SELECT ROUND((gg.finalgrade * 100) / gg.rawgrademax, 0) grade FROM mdl_course AS c JOIN mdl_context AS ctx ON c.id = ctx.instanceid JOIN mdl_role_assignments AS ra ON ra.contextid = ctx.id JOIN mdl_user AS u ON u.id = ra.userid JOIN mdl_grade_grades AS gg ON gg.userid = u.id JOIN mdl_grade_items AS gi ON gi.id = gg.itemid JOIN mdl_course_categories AS cc ON cc.id = c.category WHERE gi.courseid = c.id AND gi.itemtype = "course" AND gi.courseid = ? AND u.id = ?', array($course, $user)) ;
        return  ($score < 60) ? 0 : 1;
    }

    public function isRole($role, $user)
    {
        global $DB;
        $roles = $DB->count_records_sql('select COUNT(*) from mdl_role join mdl_role_assignments  on mdl_role.id = mdl_role_assignments.roleid where userid = ? and shortname = ?', array($user, $role));
        return $roles;
    }

    public function getStudentsByCourse($course)
    {
        global $DB;
        return $DB->get_records_sql('SELECT c.id AS courseid, c.fullname as coursename, u.id as userid, u.username, u.firstname, u.lastname, u.email FROM mdl_role_assignments ra JOIN mdl_user u ON u.id = ra.userid JOIN mdl_role r ON r.id = ra.roleid JOIN mdl_context cxt ON cxt.id = ra.contextid JOIN mdl_course c ON c.id = cxt.instanceid WHERE ra.userid = u.id AND ra.contextid = cxt.id AND cxt.contextlevel =50 AND cxt.instanceid = c.id AND roleid = 5 AND c.id = ?', array($course));
    }

    public function get_content()
    {
        global $CFG, $OUTPUT, $USER, $COURSE, $DB;
        $course = $COURSE->id;
        $user = $USER->id;

        if (empty($this->instance)) {
            $this->content = '';
            return $this->content;
        }
        $this->content = new stdClass();
        $this->content->text = '';
        $this->content->items = array();
        $this->content->icons = array();
        $this->content->footer = '';

        if ($this->isRole('editingteacher', $user)) {
            $students  = array_map(function ($s) {
                $userId = $s->userid;
                $courseId = $s->courseid;
                return (object) ['UserId' => $s->userid,
                        'CourseId' => $s->courseid,
                        'Username' => $s->username,
                        'Firstname' => $s->firstname,
                        'Lastname' => $s->lastname,
                        'Email' => $s->email,
                        'Cluster' => $this->getCluster($userId, $courseId),
                        'PercentageOfAssignCompletion' => $this->percentageOfAssignmentsCompleted($userId, $courseId),
                        'PercentageOfOpenedDiscussion' => $this->percentageOfOpenedDiscussion($userId, $courseId),
                        'PercentageOfReplies' => $this->percentageOfReplies($userId, $courseId),
                        'PercentageOfWikiEntries' => $this->percentageOfWikiEntries($userId, $courseId),
                        'PercentageOfVisitOfStudent' => $this->percentageOfVisitOfStudent($userId, $courseId),
                        'PercentagOfAccessedResource' =>  $this->percentagOfAccessedResource($userId, $courseId)
                      ];
            }, $this->getStudentsByCourse($course));

            $this->content->text .= ''
                            .'<script>'
                            .'window.students='.json_encode(array_values($students))
                            .'</script>'
                            .file_get_contents(dirname(__FILE__) . '\teacher.html');
            return $this->content;
        } else {
            $student= (object) [
                  'PercentageOfAssignCompletion' => $this->percentageOfAssignmentsCompleted($user, $course),
                  'PercentageOfOpenedDiscussion' => $this->percentageOfOpenedDiscussion($user, $course),
                  'PercentageOfReplies' => $this->percentageOfReplies($user, $course),
                  'PercentageOfWikiEntries' => $this->percentageOfWikiEntries($user, $course),
                  'PercentageOfVisitOfStudent' => $this->percentageOfVisitOfStudent($user, $course),
                  'PercentagOfAccessedResource' =>  $this->percentagOfAccessedResource($user, $course)
                ];
            $PercentageOfAssignCompletion = $this->percentageOfAssignmentsCompleted($user, $course);
            $PercentageOfWikiEntries = $this->percentageOfWikiEntries($user, $course);
            $PercentageOfOpenedDiscussion = $this->percentageOfOpenedDiscussion($user, $course);
            $PercentageOfReplies =  $this->percentageOfReplies($user, $course);
            $PercentageOfVisitOfStudent = $this->percentageOfVisitOfStudent($user, $course);
            $PercentagOfAccessedResource = $this->percentagOfAccessedResource($user, $course);

            $this->content->text .= ''
                            .'<script>'
                            .'window.student='.json_encode($student)
                            .'</script>'
                            .file_get_contents(dirname(__FILE__) . '\student.html');
            return $this->content;
        }
    }

    // my moodle can only have SITEID and it's redundant here, so take it away
    public function applicable_formats()
    {
        return array('all' => false,
                     'site' => true,
                     'site-index' => true,
                     'course-view' => true,
                     'course-view-social' => false,
                     'mod' => true,
                     'mod-quiz' => false);
    }

    public function instance_allow_multiple()
    {
        return true;
    }

    public function has_config()
    {
        return true;
    }

    public function cron()
    {
        return true;
    }
}
